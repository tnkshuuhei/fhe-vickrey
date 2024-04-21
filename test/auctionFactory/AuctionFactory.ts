import { expect } from "chai";

import { deployEncryptedERC20Fixture } from "../encryptedERC20/EncryptedERC20.fixture";
import { deployMockNFTFixture } from "../mockERC721/MockERC721.fixture";
import { getSigners, initSigners } from "../signers";
import { deployAuctionFactoryFixture } from "./AuctionFactory.fixture";

describe("Auction Factory", function () {
  before(async function () {
    await initSigners();
    this.signers = await getSigners();
  });

  beforeEach(async function () {
    // Deploy ERC20 contract with Alice account
    const contractErc20 = await deployEncryptedERC20Fixture();
    this.erc20 = contractErc20;
    this.contractERC20Address = await contractErc20.getAddress();

    const erc721 = await deployMockNFTFixture(this.signers.alice, this.signers.alice.address);
    this.erc721 = erc721;

    this.erc721.connect(this.signers.alice).safeMint(this.signers.alice.address);
    this.contractERC721Address = await erc721.getAddress();

    this.factory = await deployAuctionFactoryFixture(this.signers.alice);
    this.factoryAddress = await this.factory.getAddress();
  });

  it("should deploy a blind auction", async function () {
    const tx = await this.factory
      .connect(this.signers.alice)
      .createBlindAuction(this.signers.alice, this.contractERC20Address, this.signers.alice.address, 1000000, true);
    await tx.wait();
    const auctions: `${string}`[] = await this.factory.getAuctions();
    expect(auctions.length).to.equal(1);
    expect(auctions[0]).to.equal(await this.factory.blindAuctions(0));
  });

  it("should deploy a vickrey auction", async function () {
    const auctionAddress = await this.factory.getAuctionAddress(
      this.contractERC721Address,
      0,
      this.signers.alice.address,
      this.contractERC20Address,
      this.signers.alice.address,
      1000000,
      true,
      1,
    );

    const approveTx = await this.erc721.connect(this.signers.alice).setApprovalForAll(auctionAddress, true);
    await approveTx.wait();
    const tx = await this.factory
      .connect(this.signers.alice)
      .createVickreyAuction(
        this.contractERC721Address,
        0,
        this.signers.alice.address,
        this.contractERC20Address,
        this.signers.alice.address,
        1000000,
        true,
      );
    await tx.wait();
    const auctions: `${string}`[] = await this.factory.getAuctions();
    expect(auctions.length).to.equal(1);
    expect(auctions[0]).to.equal(auctionAddress);
  });
});
