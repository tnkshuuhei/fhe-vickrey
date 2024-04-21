import { AddressLike, Signer } from "ethers";
import { ethers } from "hardhat";

import type { MockNFT } from "../../types";

export async function deployMockNFTFixture(account: Signer, owner: AddressLike): Promise<MockNFT> {
  const contractFactory = await ethers.getContractFactory("MockNFT");
  const contract = await contractFactory.connect(account).deploy(owner);
  await contract.waitForDeployment();
  return contract;
}
