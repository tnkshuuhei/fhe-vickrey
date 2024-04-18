import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

task("task:deployVickreyAuction").setAction(async function (taskArguments: TaskArguments, { ethers }) {
  const signers = await ethers.getSigners();
  const vickreyAuctionFactory = await ethers.getContractFactory("VickreyAuction");
  const vickreyAuction = await vickreyAuctionFactory
    .connect(signers[0])
    .deploy(
      "0x06aa005386F53Ba7b980c61e0D067CaBc7602a62",
      "0xC45bc9c0E228da1Ef9cc6F0Ee4631F7e1998da69",
      "0x06aa005386F53Ba7b980c61e0D067CaBc7602a62",
      1713608515,
      true,
    ); // City of Zama's battle);
  await vickreyAuction.waitForDeployment();
  console.log("VickreyAuction deployed to: ", await vickreyAuction.getAddress());
});
