// SPDX-License-Identifier: BSD-3-Clause-Clear

pragma solidity ^0.8.20;

import "fhevm/lib/TFHE.sol";
import "fhevm/abstracts/Reencrypt.sol";
import "./EncryptedERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract VickreyAuction is Reencrypt {
    uint public endTime;

    // the person get the highest bid after the auction ends
    address public beneficiary;

    IERC721 public nft;
    uint256 public nftId;

    // Current highest bid.
    euint32 internal highestBid;

    // Current second highest bid.
    euint32 internal secondHighestBid;

    // Mapping from bidder to their bid value.
    mapping(address => euint32) public bids;

    // Number of bid
    uint public bidCounter;

    // The token contract used for encrypted bids.
    EncryptedERC20 public tokenContract;

    // Whether the auction object has been claimed.
    ebool public objectClaimed;

    // If the token has been transferred to the beneficiary
    bool public tokenTransferred;

    bool public stoppable;

    bool public manuallyStopped = false;

    // The owner of the contract.
    address public contractOwner;

    // The function has been called too early.
    // Try again at `time`.
    error TooEarly(uint time);
    // The function has been called too late.
    // It cannot be called after `time`.
    error TooLate(uint time);

    event AuctionEnded(euint32 indexed highestBid, euint32 indexed secondHighestBid);

    constructor(
        address _nft,
        uint256 _nftId,
        address _beneficiary,
        EncryptedERC20 _tokenContract,
        address _contractOwner,
        uint biddingTime,
        bool isStoppable
    ) {
        nft = IERC721(_nft);
        nftId = _nftId;
        beneficiary = _beneficiary;
        tokenContract = _tokenContract;
        endTime = block.timestamp + biddingTime;
        objectClaimed = TFHE.asEbool(false);
        tokenTransferred = false;
        bidCounter = 0;
        stoppable = isStoppable;
        contractOwner = _contractOwner;

        nft.safeTransferFrom(_beneficiary, address(this), nftId);
    }

    // Bid an `encryptedValue`.
    function bid(bytes calldata encryptedValue) public onlyBeforeEnd {
        euint32 value = TFHE.asEuint32(encryptedValue);
        euint32 existingBid = bids[msg.sender];
        if (TFHE.isInitialized(existingBid)) {
            ebool isHigher = TFHE.lt(existingBid, value);
            // Update bid with value
            bids[msg.sender] = TFHE.cmux(isHigher, value, existingBid);
            // Transfer only the difference between existing and value
            euint32 toTransfer = value - existingBid;
            // Transfer only if bid is higher
            euint32 amount = TFHE.cmux(isHigher, toTransfer, TFHE.asEuint32(0));
            tokenContract.transferFrom(msg.sender, address(this), amount);
        } else {
            bidCounter++;
            bids[msg.sender] = value;
            tokenContract.transferFrom(msg.sender, address(this), value);
        }
        euint32 currentBid = bids[msg.sender];

        if (!TFHE.isInitialized(highestBid) && !TFHE.isInitialized(secondHighestBid)) {
            highestBid = currentBid;
        } else {
            euint32 currentHighestBid = highestBid;
            // If the current bid is higher than the current highest bid,
            // update the highest to the current bid and` the second highest to the previous highest bid
            highestBid = TFHE.cmux(TFHE.lt(currentHighestBid, currentBid), currentBid, currentHighestBid);
            secondHighestBid = TFHE.cmux(TFHE.lt(currentHighestBid, currentBid), highestBid, currentBid);
        }
    }

    function getBid(
        bytes32 publicKey,
        bytes calldata signature
    ) public view onlySignedPublicKey(publicKey, signature) returns (bytes memory) {
        return TFHE.reencrypt(bids[msg.sender], publicKey, 0);
    }

    // Returns the user bid
    function stop() public onlyContractOwner {
        require(stoppable);
        manuallyStopped = true;
    }

    // Returns an encrypted value of 0 or 1 under the caller's public key, indicating
    // if the caller has the highest bid.
    function doIHaveHighestBid(
        bytes32 publicKey,
        bytes calldata signature
    ) public view onlyAfterEnd onlySignedPublicKey(publicKey, signature) returns (bytes memory) {
        if (TFHE.isInitialized(highestBid) && TFHE.isInitialized(bids[msg.sender])) {
            return TFHE.reencrypt(TFHE.le(highestBid, bids[msg.sender]), publicKey);
        } else {
            return TFHE.reencrypt(TFHE.asEuint32(0), publicKey);
        }
    }

    // Transfer token to beneficiary
    function auctionEnd() public onlyAfterEnd {
        require(!tokenTransferred);

        tokenTransferred = true;
        tokenContract.transfer(beneficiary, secondHighestBid);
        emit AuctionEnded(highestBid, secondHighestBid);
    }

    // Claim the object. Succeeds only if the caller has the highest bid.
    function claim() public onlyAfterEnd {
        ebool canClaimAsWinner = TFHE.and(TFHE.eq(highestBid, bids[msg.sender]), TFHE.not(objectClaimed));

        if (TFHE.decrypt(canClaimAsWinner)) {
            // if the caller has the highest bid and not claimed, then claim the object
            // and set the objectClaimed to true
            objectClaimed = canClaimAsWinner;

            nft.safeTransferFrom(address(this), msg.sender, nftId);

            // Update the bid to the difference between the highest and second highest bid
            // if the caller has the highest bid, otherwise keep the bid value as is
            bids[msg.sender] = TFHE.cmux(canClaimAsWinner, highestBid - secondHighestBid, bids[msg.sender]);
        }

        // call the withdraw function to transfer the bid value to the caller
        _withdraw();
    }

    // Withdraw a bid from the auction to the caller once the auction has stopped.
    function _withdraw() internal onlyAfterEnd {
        euint32 bidValue = bids[msg.sender];

        // Update the bid mapping to 0
        bids[msg.sender] = TFHE.asEuint32(0);

        // Transfer the bid value to the caller
        bool isTransferd = tokenContract.transfer(msg.sender, bidValue);

        // Revert if the transfer failed
        require(isTransferd, "Transfer failed");
    }

    modifier onlyBeforeEnd() {
        if (block.timestamp >= endTime || manuallyStopped == true) revert TooLate(endTime);
        _;
    }

    modifier onlyAfterEnd() {
        if (block.timestamp <= endTime && manuallyStopped == false) revert TooEarly(endTime);
        _;
    }

    modifier onlyContractOwner() {
        require(msg.sender == contractOwner);
        _;
    }
}
