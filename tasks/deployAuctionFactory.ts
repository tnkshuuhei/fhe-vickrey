import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

task("task:deployAuctionFactory").setAction(async function (taskArguments: TaskArguments, { ethers }) {
  const signers = await ethers.getSigners();
  const erc20Factory = await ethers.getContractFactory("AuctionFactory");
  const auctionFactory = await erc20Factory.connect(signers[0]).deploy(); // City of Zama's battle);
  await auctionFactory.waitForDeployment();
  console.log("AuctionFactory deployed to: ", await auctionFactory.getAddress());
});
