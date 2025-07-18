// scripts/deploy-mock-tokens.js
const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying Mock RWA Tokens to Sepolia...\n");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH\n");

  // Get contract factory
  const MockRWAToken = await ethers.getContractFactory("MockRWAToken");

  // Token configurations
  const tokens = [
    {
      name: "Centrifuge Real Estate Token",
      symbol: "CFG-RE",
      decimals: 18,
      type: "Real Estate",
      description: "Tokenized real estate backed by rental properties"
    },
    {
      name: "Maple Corporate Credit Token", 
      symbol: "MPL-CC",
      decimals: 18,
      type: "Corporate Credit",
      description: "Institutional lending backed by corporate loans"
    },
    {
      name: "TrueFi Uncollateralized Loan Token",
      symbol: "TRU-UL", 
      decimals: 18,
      type: "Uncollateralized Loans",
      description: "Unsecured lending protocol token"
    }
  ];

  const deployedTokens = [];

  // Deploy each token
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    
    console.log(`📝 Deploying ${token.name} (${token.symbol})...`);
    
    try {
      // Deploy the contract
      const mockToken = await MockRWAToken.deploy(
        token.name,
        token.symbol,
        token.decimals,
        token.type,
        deployer.address  // initial owner
      );

      // Wait for deployment
      await mockToken.waitForDeployment();
      const address = await mockToken.getAddress();
      
      console.log(`✅ ${token.symbol} deployed to: ${address}`);
      
      // Mint test tokens to deployer
      console.log(`   Minting initial test tokens...`);
      await mockToken.getTestTokens();
      
      const balance = await mockToken.balanceOf(deployer.address);
      console.log(`   Balance: ${ethers.formatUnits(balance, token.decimals)} ${token.symbol}\n`);
      
      deployedTokens.push({
        ...token,
        address: address,
        contract: mockToken
      });
      
      // Small delay between deployments
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error(`❌ Failed to deploy ${token.symbol}:`, error.message);
      continue;
    }
  }

  // Print summary
  console.log("🎉 Deployment Summary:");
  console.log("=" * 50);
  
  deployedTokens.forEach((token, index) => {
    console.log(`${index + 1}. ${token.name}`);
    console.log(`   Symbol: ${token.symbol}`);
    console.log(`   Type: ${token.type}`);
    console.log(`   Address: ${token.address}`);
    console.log(`   Decimals: ${token.decimals}`);
    console.log("");
  });

  // Generate frontend configuration
  console.log("📋 Frontend Configuration:");
  console.log("Copy this to your frontend:");
  console.log("=" * 50);
  
  console.log("const realRWATokens = [
  {
    address: '0x988EED42856A332211162DbF368CBE805d9C59B2',
    name: 'Centrifuge Real Estate Token',
    symbol: 'CFG-RE',
    type: 'Real Estate',
    decimals: 18
  },
  {
    address: '0x9dbAb878c774eb5506ad68aA9EA4b8362A5F744f',
    name: 'Maple Corporate Credit Token',
    symbol: 'MPL-CC',
    type: 'Corporate Credit',
    decimals: 18
  },
  {
    address: '0xAb16820FFf7899e5ef605A1FD996B6C004796bb1',
    name: 'TrueFi Uncollateralized Loan Token',
    symbol: 'TRU-UL',
    type: 'Uncollateralized Loans',
    decimals: 18
  }
];");

  // Generate contract verification commands
  console.log("\n🔍 Verification Commands:");
  console.log("Run these to verify on Etherscan:");
  console.log("=" * 50);
  
  deployedTokens.forEach(token => {
    console.log(`npx hardhat verify --network sepolia ${token.address} "${token.name}" "${token.symbol}" ${token.decimals} "${token.type}" "${deployer.address}"`);
  });

  // Instructions for getting test tokens
  console.log("\n💰 Getting Test Tokens:");
  console.log("Users can get test tokens by calling:");
  console.log("=" * 50);
  deployedTokens.forEach(token => {
    console.log(`${token.symbol}: await contract.getTestTokens() // Gets 1000 tokens`);
  });

  console.log("\n🎯 Next Steps:");
  console.log("1. Update your frontend with the new token addresses");
  console.log("2. Test the contracts by minting tokens to your wallet");
  console.log("3. Update your RWA Liquidity Hub to support these tokens");
  console.log("4. Verify the contracts on Etherscan for transparency");
}

// Error handling
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });