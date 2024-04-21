import { AddressLike, BigNumberish, Signer } from "ethers";
import { ethers } from "hardhat";

import type { VickreyAuction } from "../../types";

export async function deployVickreyAuctionFixture(
  account: Signer,
  erc721Contract: AddressLike,
  tokenId: BigNumberish,
  tokenContract: AddressLike,
  owner: AddressLike,
  biddingTime: BigNumberish,
  isStoppable: boolean,
): Promise<VickreyAuction> {
  const contractFactory = await ethers.getContractFactory("VickreyAuction");
  const contract = await contractFactory
    .connect(account)
    .deploy(erc721Contract, tokenId, account.getAddress(), tokenContract, owner, biddingTime, isStoppable);
  await contract.waitForDeployment();
  return contract;
}
