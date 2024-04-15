// SPDX-License-Identifier: BSD-3-Clause-Clear

pragma solidity ^0.8.20;

import "./BlindAuction.sol";
import "./VickreyAuction.sol";

contract AuctionFactory {
    address[] public auctions;

    event FactoryCreated(address indexed factoryAddress);
    event AuctionCreated(address indexed auctionAddress, address indexed owner, string auctionType);

    constructor() {
        emit FactoryCreated(address(this));
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
        emit AuctionCreated(address(newAuction), msg.sender, "BlindAuction");
    }

    function createVickreyAuction(
        address _beneficiary,
        EncryptedERC20 _tokenContract,
        address _contractOwner,
        uint biddingTime,
        bool isStoppable
    ) public {
        VickreyAuction newAuction = new VickreyAuction(
            _beneficiary,
            _tokenContract,
            _contractOwner,
            biddingTime,
            isStoppable
        );
        auctions.push(address(newAuction));
        emit AuctionCreated(address(newAuction), msg.sender, "VickreyAuction");
    }

    function getAuctions() public view returns (address[] memory) {
        return auctions;
    }
}
