const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Starting deployment to Sepolia...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  if (balance < ethers.parseEther("0.05")) {
    console.log("⚠️  WARNING: Low balance! Get more Sepolia ETH from faucet");
  }

  // Deploy RWAOracle FIRST
  console.log("\n📄 Deploying RWAOracle...");
  const RWAOracle = await ethers.getContractFactory("RWAOracle");
  const rwaOracle = await RWAOracle.deploy(
    deployer.address  // Oracle admin (your wallet)
  );

  console.log("⏳ Waiting for RWAOracle deployment...");
  await rwaOracle.waitForDeployment();
  console.log("✅ RWAOracle deployed to:", await rwaOracle.getAddress());

  // Deploy MorphoRWALiquidityHub
  console.log("\n📄 Deploying MorphoRWALiquidityHub...");
  const MorphoRWALiquidityHub = await ethers.getContractFactory("MorphoRWALiquidityHub");
  
  const morphoRWAHub = await MorphoRWALiquidityHub.deploy(
    deployer.address,     // Fee recipient (your wallet)
    deployer.address,     // Emergency admin (your wallet)  
    11155111             // Chain ID for Sepolia
  );

  console.log("⏳ Waiting for MorphoRWALiquidityHub deployment...");
  await morphoRWAHub.waitForDeployment();
  console.log("✅ MorphoRWALiquidityHub deployed to:", await morphoRWAHub.getAddress());

  console.log("\n🎉 DEPLOYMENT COMPLETE!");
  console.log("=====================================");
  console.log("RWAOracle:", await rwaOracle.getAddress());
  console.log("MorphoRWALiquidityHub:", await morphoRWAHub.getAddress());
  console.log("Deployer:", deployer.address);
  console.log("Network: Sepolia Testnet");
  
  console.log("\n📝 UPDATE YOUR FRONTEND:");
  console.log(`NEXT_PUBLIC_RWA_ORACLE_ADDRESS=${await rwaOracle.getAddress()}`);
  console.log(`NEXT_PUBLIC_MORPHO_RWA_CONTRACT_ADDRESS=${await morphoRWAHub.getAddress()}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });