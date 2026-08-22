import { expect } from "chai";
import { ethers } from "hardhat";

describe("CarbonCredit", () => {
  async function deployFixture() {
    const [admin, verifier, developer, buyer, stranger] = await ethers.getSigners();
    const CarbonCredit = await ethers.getContractFactory("CarbonCredit");
    const cc = await CarbonCredit.deploy("Simulated Carbon Credit", "sCO2", 0);
    await cc.waitForDeployment();
    await cc.setVerifier(verifier.address, true);

    const projectId = ethers.keccak256(ethers.toUtf8Bytes("PRJ-1"));
    await cc.registerProject(projectId, developer.address, "REDD+ (simulated)", "BR", "ipfs://p1");

    return { cc, admin, verifier, developer, buyer, stranger, projectId };
  }

  it("registers an issuer/verifier (admin only)", async () => {
    const { cc, admin, stranger } = await deployFixture();
    await expect(cc.connect(admin).setVerifier(stranger.address, true)).to.not.be.reverted;
    expect(await cc.hasRole(await cc.VERIFIER_ROLE(), stranger.address)).to.equal(true);
  });

  it("rejects unauthorized issuer registration", async () => {
    const { cc, stranger } = await deployFixture();
    await expect(cc.connect(stranger).setVerifier(stranger.address, true)).to.be.reverted;
  });

  it("allows an authorized verifier to issue a credit batch", async () => {
    const { cc, verifier, developer, projectId } = await deployFixture();
    const batchId = ethers.keccak256(ethers.toUtf8Bytes("B1"));
    await cc.connect(verifier).issueBatch(batchId, projectId, 500, 2024, "ipfs://audit", developer.address);
    expect(await cc.balanceOf(developer.address)).to.equal(500);
  });

  it("rejects issuance from an unauthorized address", async () => {
    const { cc, stranger, developer, projectId } = await deployFixture();
    const batchId = ethers.keccak256(ethers.toUtf8Bytes("B2"));
    await expect(
      cc.connect(stranger).issueBatch(batchId, projectId, 100, 2024, "ipfs://audit", developer.address)
    ).to.be.reverted;
  });

  it("rejects zero-amount credit issuance", async () => {
    const { cc, verifier, developer, projectId } = await deployFixture();
    const batchId = ethers.keccak256(ethers.toUtf8Bytes("B3"));
    await expect(
      cc.connect(verifier).issueBatch(batchId, projectId, 0, 2024, "ipfs://audit", developer.address)
    ).to.be.revertedWith("Amount must be > 0");
  });

  it("transfers active credits between accounts", async () => {
    const { cc, verifier, developer, buyer, projectId } = await deployFixture();
    const batchId = ethers.keccak256(ethers.toUtf8Bytes("B4"));
    await cc.connect(verifier).issueBatch(batchId, projectId, 200, 2024, "ipfs://audit", developer.address);
    await cc.connect(developer).transfer(buyer.address, 80);
    expect(await cc.balanceOf(buyer.address)).to.equal(80);
    expect(await cc.balanceOf(developer.address)).to.equal(120);
  });

  it("retires credits and updates retiredSupply", async () => {
    const { cc, verifier, developer, projectId } = await deployFixture();
    const batchId = ethers.keccak256(ethers.toUtf8Bytes("B5"));
    await cc.connect(verifier).issueBatch(batchId, projectId, 100, 2024, "ipfs://audit", developer.address);

    await expect(cc.connect(developer).retire(20, "offset travel", "ipfs://claim"))
      .to.emit(cc, "Retired");

    expect(await cc.balanceOf(developer.address)).to.equal(80);
    expect(await cc.retiredSupply()).to.equal(20);
  });

  it("prevents retiring more than the owned balance", async () => {
    const { cc, verifier, developer, projectId } = await deployFixture();
    const batchId = ethers.keccak256(ethers.toUtf8Bytes("B6"));
    await cc.connect(verifier).issueBatch(batchId, projectId, 10, 2024, "ipfs://audit", developer.address);
    await expect(cc.connect(developer).retire(50, "invalid", "ipfs://claim")).to.be.reverted;
  });

  it("emits BatchIssued and Retired events with correct args", async () => {
    const { cc, verifier, developer, projectId } = await deployFixture();
    const batchId = ethers.keccak256(ethers.toUtf8Bytes("B7"));
    await expect(cc.connect(verifier).issueBatch(batchId, projectId, 30, 2026, "ipfs://audit", developer.address))
      .to.emit(cc, "BatchIssued")
      .withArgs(batchId, projectId, 30, 2026, verifier.address);
  });
});

describe("FixedPriceMarket", () => {
  async function marketFixture() {
    const [admin, verifier, seller, buyer] = await ethers.getSigners();
    const CarbonCredit = await ethers.getContractFactory("CarbonCredit");
    const cc = await CarbonCredit.deploy("Simulated Carbon Credit", "sCO2", 0);
    await cc.waitForDeployment();
    await cc.setVerifier(verifier.address, true);

    const projectId = ethers.keccak256(ethers.toUtf8Bytes("PRJ-M"));
    await cc.registerProject(projectId, seller.address, "Wind (simulated)", "IN", "ipfs://pM");
    const batchId = ethers.keccak256(ethers.toUtf8Bytes("BM"));
    await cc.connect(verifier).issueBatch(batchId, projectId, 100, 2026, "ipfs://audit", seller.address);

    const Market = await ethers.getContractFactory("FixedPriceMarket");
    const market = await Market.deploy(await cc.getAddress());
    await market.waitForDeployment();

    return { cc, market, admin, verifier, seller, buyer };
  }

  it("lets an owner list credits for sale after approval", async () => {
    const { cc, market, seller } = await marketFixture();
    await cc.connect(seller).approve(await market.getAddress(), 50);
    await expect(market.connect(seller).list(50, ethers.parseEther("0.001"))).to.not.be.reverted;
  });

  it("rejects listing without prior approval", async () => {
    const { market, seller } = await marketFixture();
    await expect(market.connect(seller).list(50, ethers.parseEther("0.001"))).to.be.revertedWith(
      "Approve marketplace first"
    );
  });

  it("lets a buyer purchase listed credits and transfers ownership", async () => {
    const { cc, market, seller, buyer } = await marketFixture();
    const price = ethers.parseEther("0.001");
    await cc.connect(seller).approve(await market.getAddress(), 50);
    await market.connect(seller).list(50, price);

    const cost = 20n * price;
    await expect(market.connect(buyer).buy(1, 20, { value: cost })).to.emit(market, "Purchased");

    expect(await cc.balanceOf(buyer.address)).to.equal(20);
  });

  it("closes the listing automatically once fully sold", async () => {
    const { cc, market, seller, buyer } = await marketFixture();
    const price = ethers.parseEther("0.001");
    await cc.connect(seller).approve(await market.getAddress(), 10);
    await market.connect(seller).list(10, price);
    await market.connect(buyer).buy(1, 10, { value: 10n * price });

    const listing = await market.listings(1);
    expect(listing.active).to.equal(false);
  });

  it("rejects a purchase with the wrong ETH amount", async () => {
    const { cc, market, seller, buyer } = await marketFixture();
    const price = ethers.parseEther("0.001");
    await cc.connect(seller).approve(await market.getAddress(), 10);
    await market.connect(seller).list(10, price);
    await expect(market.connect(buyer).buy(1, 10, { value: price })).to.be.revertedWith("Incorrect ETH sent");
  });
});
