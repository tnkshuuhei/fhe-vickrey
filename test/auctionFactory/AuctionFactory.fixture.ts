import { Signer } from "ethers";
import { ethers } from "hardhat";

import type { AuctionFactory } from "../../types";

export async function deployAuctionFactoryFixture(account: Signer): Promise<AuctionFactory> {
  const contractFactory = await ethers.getContractFactory("AuctionFactory");
  const contract = await contractFactory.connect(account).deploy();
  await contract.waitForDeployment();
  return contract;
}
