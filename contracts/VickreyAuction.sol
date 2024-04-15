// SPDX-License-Identifier: BSD-3-Clause-Clear

pragma solidity ^0.8.20;

import "fhevm/lib/TFHE.sol";
import "fhevm/abstracts/Reencrypt.sol";
import "./EncryptedERC20.sol";

contract VickreyAuction is Reencrypt {
    uint public endTime;

    // the person get the highest bid after the auction ends
    address public beneficiary;

    // Current highest bid.
    euint64 internal highestBid;

    // Current second highest bid.
    euint64 internal secondHighestBid;

    // Mapping from bidder to their bid value.
    mapping(address => euint64) public bids;

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

    event AuctionEnded(euint64 indexed highestBid, euint64 indexed secondHighestBid);

    constructor(
        address _beneficiary,
        EncryptedERC20 _tokenContract,
        address _contractOwner,
        uint biddingTime,
        bool isStoppable
    ) {
        beneficiary = _beneficiary;
        tokenContract = _tokenContract;
        endTime = block.timestamp + biddingTime;
        objectClaimed = TFHE.asEbool(false);
        tokenTransferred = false;
        bidCounter = 0;
        stoppable = isStoppable;
        contractOwner = _contractOwner;
    }

    // Bid an `encryptedValue`.
    function bid(bytes calldata encryptedValue) public onlyBeforeEnd {
        euint64 value = TFHE.asEuint64(encryptedValue);
        euint64 existingBid = bids[msg.sender];
        if (TFHE.isInitialized(existingBid)) {
            ebool isHigher = TFHE.lt(existingBid, value);
            // Update bid with value
            bids[msg.sender] = TFHE.select(isHigher, value, existingBid);
            // Transfer only the difference between existing and value
            euint64 toTransfer = value - existingBid;
            // Transfer only if bid is higher
            euint64 amount = TFHE.select(isHigher, toTransfer, TFHE.asEuint64(0));
            tokenContract.transferFrom(msg.sender, address(this), amount);
        } else {
            bidCounter++;
            bids[msg.sender] = value;
            tokenContract.transferFrom(msg.sender, address(this), value);
        }
        euint64 currentBid = bids[msg.sender];

        if (!TFHE.isInitialized(highestBid) && !TFHE.isInitialized(secondHighestBid)) {
            highestBid = currentBid;
        } else {
            euint64 currentHighestBid = highestBid;
            // If the current bid is higher than the current highest bid, update the highest to the current bid and the second highest to the previous highest bid
            highestBid = TFHE.select(TFHE.lt(currentHighestBid, currentBid), currentBid, currentHighestBid);
            secondHighestBid = TFHE.select(TFHE.lt(currentHighestBid, currentBid), highestBid, currentBid);
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
            return TFHE.reencrypt(TFHE.asEuint64(0), publicKey);
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
        ebool canClaim = TFHE.and(TFHE.le(highestBid, bids[msg.sender]), TFHE.not(objectClaimed));

        // if the caller has the highest bid and not claimed, then claim the object
        // and set the objectClaimed to true
        objectClaimed = canClaim;
        // TODO: transfer token or NFT or something to the winner

        // Update the bid to the difference between the highest and second highest bid
        // if the caller has the highest bid, otherwise keep the bid value as is
        bids[msg.sender] = TFHE.select(canClaim, highestBid - secondHighestBid, bids[msg.sender]);

        // call the withdraw function to transfer the bid value to the caller
        _withdraw();
    }

    // Withdraw a bid from the auction to the caller once the auction has stopped.
    function _withdraw() internal onlyAfterEnd {
        euint64 bidValue = bids[msg.sender];

        // Update the bid mapping to 0
        bids[msg.sender] = TFHE.asEuint64(0);

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
