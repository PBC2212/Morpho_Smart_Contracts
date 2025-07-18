// scripts/check-config.js - Quick diagnostic script
const fs = require('fs');
const path = require('path');

function checkFile(filePath, description) {
  console.log(`\n📄 ${description}:`);
  console.log(`   File: ${filePath}`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`   ❌ File not found`);
    return;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Look for contract addresses
    const addressPattern = /0x[a-fA-F0-9]{40}/g;
    const addresses = content.match(addressPattern) || [];
    
    // Look for key patterns
    const patterns = [
      { name: 'RWA_HUB', regex: /RWA_HUB[^=]*[:=][^,;\n]*/g },
      { name: 'RWA_ORACLE', regex: /RWA_ORACLE[^=]*[:=][^,;\n]*/g },
      { name: 'CONTRACT_ADDRESS', regex: /CONTRACT_ADDRESS[^=]*[:=][^,;\n]*/g },
      { name: 'SEPOLIA_URL', regex: /SEPOLIA_URL[^=]*[:=][^,;\n]*/g },
      { name: 'PRIVATE_KEY', regex: /PRIVATE_KEY[^=]*[:=][^,;\n]*/g },
      { name: 'ETHERSCAN_API', regex: /ETHERSCAN[^=]*[:=][^,;\n]*/g }
    ];

    console.log(`   📍 Found ${addresses.length} addresses: ${addresses.slice(0, 3).join(', ')}${addresses.length > 3 ? '...' : ''}`);
    
    patterns.forEach(({ name, regex }) => {
      const matches = content.match(regex);
      if (matches) {
        matches.forEach(match => {
          console.log(`   🔑 ${name}: ${match.trim()}`);
        });
      }
    });

  } catch (error) {
    console.log(`   ❌ Error reading file: ${error.message}`);
  }
}

// Check key files
console.log('🔍 Configuration Diagnostic Report\n');

checkFile('.env', 'Backend Environment');
checkFile('hardhat.config.js', 'Hardhat Configuration');
checkFile('morpho-rwa-frontend/utils/index.ts', 'Frontend Utils');
checkFile('morpho-rwa-frontend/utils/contracts.ts', 'Frontend Contracts');
checkFile('morpho-rwa-frontend/.env.local', 'Frontend Environment');
checkFile('morpho-rwa-frontend/pages/index.tsx', 'Frontend Main Page');

console.log('\n✅ Diagnostic complete!');