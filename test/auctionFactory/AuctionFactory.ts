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
    await factory
      .connect(this.signers.alice)
      .createBlindAuction(this.signers.alice, this.contractERC20Address, this.signers.alice.address, 1000000, true);
    await expect(
      factory.createBlindAuction(
        this.signers.alice,
        this.contractERC20Address,
        this.signers.alice.address,
        1000000,
        true,
      ),
    ).to.emit(factory, "AuctionCreated");
  });

  it("should deploy a vickrey auction", async function () {
    await factory
      .connect(this.signers.alice)
      .createVickreyAuction(this.signers.alice, this.contractERC20Address, this.signers.alice.address, 1000000, true);
    await expect(
      factory.createVickreyAuction(
        this.signers.alice,
        this.contractERC20Address,
        this.signers.alice.address,
        1000000,
        true,
      ),
    ).to.emit(factory, "AuctionCreated");
  });
  it("should return the auction address", async function () {
    await factory
      .connect(this.signers.alice)
      .createVickreyAuction(this.signers.alice, this.contractERC20Address, this.signers.alice.address, 1000000, true);
    const auctions: `${string}`[] = await factory.getAuctions();
    expect(auctions.length).to.equal(1);
  });
});
