import { expect } from "chai";

import type { AuctionFactory } from "../../types";
import { deployEncryptedERC20Fixture } from "../encryptedERC20/EncryptedERC20.fixture";
import { getSigners, initSigners } from "../signers";
import { deployAuctionFactoryFixture } from "./AuctionFactory.fixture";

describe("Auction Factory", function () {
  let factory: AuctionFactory;

  before(async function () {
    await initSigners();
    this.signers = await getSigners();
  });

  beforeEach(async function () {
    // Deploy ERC20 contract with Alice account
    const contractErc20 = await deployEncryptedERC20Fixture();
    this.erc20 = contractErc20;
    this.contractERC20Address = await contractErc20.getAddress();

    factory = await deployAuctionFactoryFixture(this.signers.alice);
  });

  it("should deploy a blind auction", async function () {
    const tx = await factory
      .connect(this.signers.alice)
      .createBlindAuction(this.signers.alice, this.contractERC20Address, this.signers.alice.address, 1000000, true);
    await tx.wait();
    const auctions: `${string}`[] = await factory.getAuctions();
    expect(auctions.length).to.equal(1);
    expect(auctions[0]).to.equal(await factory.blindAuctions(0));
  });

  it("should deploy a vickrey auction", async function () {
    const tx = await factory
      .connect(this.signers.alice)
      .createVickreyAuction(this.signers.alice, this.contractERC20Address, this.signers.alice.address, 1000000, true);
    await tx.wait();
    const auctions: `${string}`[] = await factory.getAuctions();
    expect(auctions.length).to.equal(1);
    expect(auctions[0]).to.equal(await factory.vickreyAuctions(0));
  });
  it("should return the auction address", async function () {
    const tx = await factory
      .connect(this.signers.alice)
      .createVickreyAuction(this.signers.alice, this.contractERC20Address, this.signers.alice.address, 1000000, true);
    await tx.wait();
    const auctions: `${string}`[] = await factory.getAuctions();
    expect(auctions.length).to.equal(1);
  });
});
