import { ethers } from "hardhat";

async function main() {
  const [admin, verifier, developer, buyer] = await ethers.getSigners();

  const CarbonCredit = await ethers.getContractFactory("CarbonCredit");
  const cc = await CarbonCredit.deploy("Simulated Carbon Credit", "sCO2", 0);
  await cc.waitForDeployment();
  console.log("CarbonCredit deployed to:", await cc.getAddress());

  await (await cc.setVerifier(verifier.address, true)).wait();
  console.log("Verifier registered:", verifier.address);

  // Register a simulated project
  const projectId = ethers.keccak256(ethers.toUtf8Bytes("SOLAR-IND-2026-DEMO-001"));
  await (
    await cc.connect(admin).registerProject(
      projectId,
      developer.address,
      "Simulated Solar Methodology",
      "IN",
      "ipfs://sample-project-metadata"
    )
  ).wait();
  console.log("Project registered:", projectId);

  // Issue a batch of 10 simulated credits to the project developer
  const batchId = ethers.keccak256(ethers.toUtf8Bytes("BATCH-001"));
  await (
    await cc.connect(verifier).issueBatch(
      batchId,
      projectId,
      10,
      2026,
      "ipfs://sample-audit-docs",
      developer.address
    )
  ).wait();
  console.log("Batch issued: 10 sCO2 to", developer.address);

  const Market = await ethers.getContractFactory("FixedPriceMarket");
  const market = await Market.deploy(await cc.getAddress());
  await market.waitForDeployment();
  console.log("FixedPriceMarket deployed to:", await market.getAddress());

  console.log("\nDeployment complete. Sample accounts:");
  console.log("  Admin:     ", admin.address);
  console.log("  Verifier:  ", verifier.address);
  console.log("  Developer: ", developer.address);
  console.log("  Buyer:     ", buyer.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
