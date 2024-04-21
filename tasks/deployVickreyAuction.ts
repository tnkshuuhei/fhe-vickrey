import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

task("task:deployVickreyAuction").setAction(async function (taskArguments: TaskArguments, { ethers }) {
  const signers = await ethers.getSigners();
  const vickreyAuctionFactory = await ethers.getContractFactory("VickreyAuction");
  const vickreyAuction = await vickreyAuctionFactory.connect(signers[0]).deploy(
    "0x06aa005386F53Ba7b980c61e0D067CaBc7602a62", // nft contract
    0, // tokenId
    "0x06aa005386F53Ba7b980c61e0D067CaBc7602a62",
    "0x975a98681fB5C8DFCFf90dbC6C2B574806c5fd94",
    "0x06aa005386F53Ba7b980c61e0D067CaBc7602a62",
    604800, // 1week
    true,
  ); // City of Zama's battle);
  await vickreyAuction.waitForDeployment();
  console.log("VickreyAuction deployed to: ", await vickreyAuction.getAddress());
});
