import { expect } from "chai";
import { ethers } from "hardhat";

import { VickreyAuction, VickreyAuction__factory } from "../../types";
import { deployAuctionFactoryFixture } from "../auctionFactory/AuctionFactory.fixture";
import { deployEncryptedERC20Fixture } from "../encryptedERC20/EncryptedERC20.fixture";
import { createInstances } from "../instance";
import { deployMockNFTFixture } from "../mockERC721/MockERC721.fixture";
import { getSigners, initSigners } from "../signers";

describe("Vickrey Auction", function () {
  before(async function () {
    await initSigners();
    this.signers = await getSigners();
  });

  beforeEach(async function () {
    // Deploy ERC20 contract with Alice account
    const contractErc20 = await deployEncryptedERC20Fixture();
    this.erc20 = contractErc20;
    this.contractERC20Address = await contractErc20.getAddress();
    const instance = await createInstances(this.contractERC20Address, ethers, this.signers);

    // Mint with Alice account
    const transaction = await this.erc20.mint(1000);
    await transaction.wait();

    const erc721 = await deployMockNFTFixture(this.signers.alice, this.signers.alice.address);
    this.erc721 = erc721;
    this.contractERC721Address = await erc721.getAddress();

    const factory = await deployAuctionFactoryFixture(this.signers.alice);
    this.factory = factory;
    this.factoryAddress = await this.factory.getAddress();

    const auctionAddress = await factory.getAuctionAddress(
      this.contractERC721Address,
      0,
      this.signers.alice.address,
      this.contractERC20Address,
      this.signers.alice.address,
      1000000,
      true,
      1,
    );

    this.erc721.connect(this.signers.alice).safeMint(this.signers.alice.address);
    // set approval for all
    const approveTx = await this.erc721.connect(this.signers.alice).setApprovalForAll(auctionAddress, true);
    await approveTx.wait();

    // Deploy Vickrey auction
    const contractPromise = await this.factory
      .connect(this.signers.alice)
      .createVickreyAuction(
        this.contractERC721Address,
        0,
        this.signers.alice,
        this.contractERC20Address,
        this.signers.alice.address,
        1000000,
        true,
      );

    await contractPromise.wait();

    // Transfer 100 tokens to Bob
    const encryptedTransferAmount = instance.alice.encrypt32(100);
    const tx = await this.erc20["transfer(address,bytes)"](this.signers.bob.address, encryptedTransferAmount);

    // Transfer 100 tokens to Carol
    const tx2 = await this.erc20["transfer(address,bytes)"](this.signers.carol.address, encryptedTransferAmount);
    await Promise.all([tx.wait(), tx2.wait()]);

    this.contractAddress = auctionAddress;

    const vickreyAuction: VickreyAuction = VickreyAuction__factory.connect(this.contractAddress, this.signers.alice);
    this.vickreyAuction = vickreyAuction;

    const instances = await createInstances(this.contractAddress, ethers, this.signers);
    this.instances = instances;
  });

  it("should bid the auction", async function () {
    const bobBidAmount = this.instances.bob.encrypt32(10);
    const carolBidAmount = this.instances.carol.encrypt32(20);

    // To be able to bid, we give approbation to
    // the blind auction to spend tokens on Bob's and Carol's behalf.
    const txeBobApprove = await this.erc20
      .connect(this.signers.bob)
      ["approve(address,bytes)"](this.contractAddress, bobBidAmount);
    const txCarolApprove = await this.erc20
      .connect(this.signers.carol)
      ["approve(address,bytes)"](this.contractAddress, carolBidAmount);
    await Promise.all([txeBobApprove.wait(), txCarolApprove.wait()]);

    const txCarolBid = await this.vickreyAuction.connect(this.signers.carol).bid(carolBidAmount, { gasLimit: 5000000 });
    const txBobBid = await this.vickreyAuction.connect(this.signers.bob).bid(bobBidAmount, { gasLimit: 5000000 });
    await Promise.all([txCarolBid.wait(), txBobBid.wait()]);

    // Stop the auction
    const txAliceStop = await this.vickreyAuction.connect(this.signers.alice).stop();
    await txAliceStop.wait();

    const tokenCarol = this.instances.carol.getPublicKey(this.contractAddress)!;

    const carolBidAmountCheckEnc = await this.vickreyAuction
      .connect(this.signers.carol)
      .getBid(tokenCarol.publicKey, tokenCarol.signature);
    const carolBidAmountCheckDec = this.instances.carol.decrypt(this.contractAddress, carolBidAmountCheckEnc);
    expect(carolBidAmountCheckDec).to.equal(20);

    const tokenBob = this.instances.bob.getPublicKey(this.contractAddress)!;
    const bobBidAmountCheckEnc = await this.vickreyAuction
      .connect(this.signers.bob)
      .getBid(tokenBob.publicKey, tokenBob.signature);
    const bobBidAmountCheckDec = this.instances.bob.decrypt(this.contractAddress, bobBidAmountCheckEnc);
    expect(bobBidAmountCheckDec).to.equal(10);
  });

  it("should carol has highest bid", async function () {
    const bobBidAmount = this.instances.bob.encrypt32(10);
    const carolBidAmount = this.instances.carol.encrypt32(20);

    // To be able to bid, we give approbation to
    // the blind auction to spend tokens on Bob's and Carol's behalf.
    const txeBobApprove = await this.erc20
      .connect(this.signers.bob)
      ["approve(address,bytes)"](this.contractAddress, bobBidAmount);
    const txCarolApprove = await this.erc20
      .connect(this.signers.carol)
      ["approve(address,bytes)"](this.contractAddress, carolBidAmount);
    await Promise.all([txeBobApprove.wait(), txCarolApprove.wait()]);

    const txCarolBid = await this.vickreyAuction.connect(this.signers.carol).bid(carolBidAmount, { gasLimit: 5000000 });
    const txBobBid = await this.vickreyAuction.connect(this.signers.bob).bid(bobBidAmount, { gasLimit: 5000000 });
    await Promise.all([txCarolBid.wait(), txBobBid.wait()]);

    // Stop the auction
    const txAliceStop = await this.vickreyAuction.connect(this.signers.alice).stop();
    await txAliceStop.wait();

    const tokenCarol = this.instances.carol.getPublicKey(this.contractAddress)!;
    const tokenBob = this.instances.bob.getPublicKey(this.contractAddress)!;

    const carolHighestBidEnc = await this.vickreyAuction
      .connect(this.signers.carol)
      .doIHaveHighestBid(tokenCarol.publicKey, tokenCarol.signature);
    const carolHighestBidDec = this.instances.carol.decrypt(this.contractAddress, carolHighestBidEnc);
    expect(carolHighestBidDec).to.equal(1);

    const bobHighestBidEnc = await this.vickreyAuction
      .connect(this.signers.bob)
      .doIHaveHighestBid(tokenBob.publicKey, tokenBob.signature);
    const bobHighestBidDec = this.instances.bob.decrypt(this.contractAddress, bobHighestBidEnc);
    expect(bobHighestBidDec).to.equal(0);
  });

  it("should claim the bid amount", async function () {
    const bobBidAmount = this.instances.bob.encrypt32(10);
    const carolBidAmount = this.instances.carol.encrypt32(20);

    // To be able to bid, we give approbation to
    // the blind auction to spend tokens on Bob's and Carol's behalf.
    const txeBobApprove = await this.erc20
      .connect(this.signers.bob)
      ["approve(address,bytes)"](this.contractAddress, bobBidAmount);
    const txCarolApprove = await this.erc20
      .connect(this.signers.carol)
      ["approve(address,bytes)"](this.contractAddress, carolBidAmount);
    await Promise.all([txeBobApprove.wait(), txCarolApprove.wait()]);

    const txCarolBid = await this.vickreyAuction.connect(this.signers.carol).bid(carolBidAmount, { gasLimit: 5000000 });
    const txBobBid = await this.vickreyAuction.connect(this.signers.bob).bid(bobBidAmount, { gasLimit: 5000000 });
    await Promise.all([txCarolBid.wait(), txBobBid.wait()]);

    // Stop the auction
    const txAliceStop = await this.vickreyAuction.connect(this.signers.alice).stop();
    await txAliceStop.wait();

    const txCarolClaim = await this.vickreyAuction.connect(this.signers.carol).claim();
    await txCarolClaim.wait();
    const instance = await createInstances(this.contractERC20Address, ethers, this.signers);
    const tokenCarol = instance.carol.getPublicKey(this.contractERC20Address)!;

    const encryptedBalanceCarol = await this.erc20
      .connect(this.signers.carol)
      .balanceOf(this.signers.carol, tokenCarol.publicKey, tokenCarol.signature);

    const balanceCarol = instance.carol.decrypt(this.contractERC20Address, encryptedBalanceCarol);
    expect(balanceCarol).to.equal(100 - 20 + 10);

    const txBobClaim = await this.vickreyAuction.connect(this.signers.bob).claim();
    await txBobClaim.wait();

    const tokenBob = instance.bob.getPublicKey(this.contractERC20Address)!;
    const encryptedBalanceBob = await this.erc20
      .connect(this.signers.bob)
      .balanceOf(this.signers.bob, tokenBob.publicKey, tokenBob.signature);

    const balanceBob = instance.bob.decrypt(this.contractERC20Address, encryptedBalanceBob);
    expect(balanceBob).to.equal(100);
  });

  it("should Carol won the auction", async function () {
    const bobBidAmount = this.instances.bob.encrypt32(10);
    const carolBidAmount = this.instances.carol.encrypt32(20);

    // To be able to bid, we give approbation to
    // the blind auction to spend tokens on Bob's and Carol's behalf.
    const txeBobApprove = await this.erc20
      .connect(this.signers.bob)
      ["approve(address,bytes)"](this.contractAddress, bobBidAmount);
    const txCarolApprove = await this.erc20
      .connect(this.signers.carol)
      ["approve(address,bytes)"](this.contractAddress, carolBidAmount);
    await Promise.all([txeBobApprove.wait(), txCarolApprove.wait()]);

    // Need to add gasLimit to avoid a gas limit issue for two parallel bids
    // When two tx are consecutive in the same block, if the similar second is asking more gas the tx will fail
    // because the allocated gas will be the first one gas amount.
    // This is typically the case for the bid method and the if, else branch inside, i.e. the first bid has no further computation
    // concerning the highestBid but all the following need to check against the current one.
    const txCarolBid = await this.vickreyAuction.connect(this.signers.carol).bid(carolBidAmount, { gasLimit: 5000000 });
    const txBobBid = await this.vickreyAuction.connect(this.signers.bob).bid(bobBidAmount, { gasLimit: 5000000 });
    await Promise.all([txCarolBid.wait(), txBobBid.wait()]);

    // Stop the auction
    const txAliceStop = await this.vickreyAuction.connect(this.signers.alice).stop();
    await txAliceStop.wait();

    const txCarolClaim = await this.vickreyAuction.connect(this.signers.carol).claim();
    await txCarolClaim.wait();

    const txCarolWithdraw = await this.vickreyAuction.connect(this.signers.carol).auctionEnd();
    await txCarolWithdraw.wait();

    const instance = await createInstances(this.contractERC20Address, ethers, this.signers);
    const tokenAlice = instance.alice.getPublicKey(this.contractERC20Address)!;
    const encryptedBalanceAlice = await this.erc20.balanceOf(
      this.signers.alice,
      tokenAlice.publicKey,
      tokenAlice.signature,
    );

    const balanceAlice = instance.alice.decrypt(this.contractERC20Address, encryptedBalanceAlice);
    expect(balanceAlice).to.equal(1000 - 100 - 100 + 10);
  });
});
