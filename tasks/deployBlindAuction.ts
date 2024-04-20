import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

task("task:deployBlindAuction").setAction(async function (taskArguments: TaskArguments, { ethers }) {
  const signers = await ethers.getSigners();
  const blindAuctionFactory = await ethers.getContractFactory("BlindAuction");
  const blindAuction = await blindAuctionFactory
    .connect(signers[0])
    .deploy(
      "0x06aa005386F53Ba7b980c61e0D067CaBc7602a62",
      "0x975a98681fB5C8DFCFf90dbC6C2B574806c5fd94",
      "0x06aa005386F53Ba7b980c61e0D067CaBc7602a62",
      1713608515,
      true,
    ); // City of Zama's battle);
  await blindAuction.waitForDeployment();
  console.log("BlindAuction deployed to: ", await blindAuction.getAddress());
});
