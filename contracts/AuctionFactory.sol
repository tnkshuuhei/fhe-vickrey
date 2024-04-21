// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import "./BlindAuction.sol";
import "./VickreyAuction.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract AuctionFactory {
    address[] public auctions;

    BlindAuction[] public blindAuctions;
    VickreyAuction[] public vickreyAuctions;

    event FactoryCreated(address indexed factoryAddress);
    event AuctionCreated(address indexed auctionAddress, address indexed owner, string auctionType);

    constructor() {
        emit FactoryCreated(address(this));
    }

    enum AuctionType {
        BlindAuction,
        VickreyAuction
    }

    function createBlindAuction(
        address _beneficiary,
        EncryptedERC20 _tokenContract,
        address _contractOwner,
        uint biddingTime,
        bool isStoppable
    ) public {
        BlindAuction newAuction = new BlindAuction(
            _beneficiary,
            _tokenContract,
            _contractOwner,
            biddingTime,
            isStoppable
        );
        auctions.push(address(newAuction));
        blindAuctions.push(newAuction);
        emit AuctionCreated(address(newAuction), msg.sender, "BlindAuction");
    }

    function createVickreyAuction(
        ERC721 _nft,
        uint256 _nftId,
        address _beneficiary,
        EncryptedERC20 _tokenContract,
        address _contractOwner,
        uint biddingTime,
        bool isStoppable
    ) public returns (address newAuction) {
        newAuction = getAuctionAddress(
            _nft,
            _nftId,
            _beneficiary,
            _tokenContract,
            _contractOwner,
            biddingTime,
            isStoppable,
            AuctionType.VickreyAuction
        );

        auctions.push(newAuction);
        emit AuctionCreated(address(newAuction), msg.sender, "VickreyAuction");
        return newAuction;
    }

    // function that returns the auction address deployed by create2
    function getAuctionAddress(
        ERC721 _nft,
        uint256 _nftId,
        address _beneficiary,
        EncryptedERC20 _tokenContract,
        address _contractOwner,
        uint biddingTime,
        bool isStoppable,
        AuctionType auctionType
    ) public view returns (address) {
        bytes memory bytecode = type(VickreyAuction).creationCode;
        bytes32 salt = keccak256(
            abi.encodePacked(
                _nft,
                _nftId,
                _beneficiary,
                _tokenContract,
                _contractOwner,
                biddingTime,
                isStoppable,
                auctionType
            )
        );
        return address(uint160(uint256(keccak256(abi.encodePacked(bytecode, salt, address(this))))));
    }

    function getAuctions() public view returns (address[] memory) {
        return auctions;
    }
}
