#!/usr/bin/env node
// scripts/universal-updater.js - Universal Project Configuration Updater

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const crypto = require('crypto');

class UniversalConfigUpdater {
  constructor() {
    this.projectRoot = process.cwd();
    this.config = {};
    this.allFiles = [];
    this.updatedFiles = [];
    this.backupDir = path.join(this.projectRoot, '.config-backups');
    this.excludeDirs = [
      'node_modules', 
      '.git', 
      '.next', 
      'dist', 
      'build', 
      '.config-backups',
      'coverage',
      '.nyc_output',
      'artifacts',
      'cache'
    ];
    this.includeExtensions = [
      '.js', '.jsx', '.ts', '.tsx', '.json', '.env', '.md', 
      '.sol', '.yaml', '.yml', '.toml', '.config', '.example'
    ];
  }

  // Recursively scan ENTIRE project
  scanAllFiles(dir = this.projectRoot, relativePath = '') {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relPath = path.join(relativePath, entry.name);
        
        if (entry.isDirectory()) {
          // Skip excluded directories
          if (!this.excludeDirs.includes(entry.name) && !entry.name.startsWith('.')) {
            this.scanAllFiles(fullPath, relPath);
          }
        } else if (entry.isFile()) {
          // Include files with relevant extensions or important names
          const ext = path.extname(entry.name);
          const importantFiles = [
            'package.json', 'hardhat.config.js', 'hardhat.config.ts',
            '.env', '.env.local', '.env.example', '.env.production',
            'next.config.js', 'next.config.ts', 'tsconfig.json',
            'tailwind.config.js', 'tailwind.config.ts',
            'vite.config.js', 'vite.config.ts', 'webpack.config.js'
          ];
          
          if (this.includeExtensions.includes(ext) || importantFiles.includes(entry.name)) {
            this.allFiles.push({
              fullPath,
              relativePath: relPath,
              extension: ext,
              name: entry.name
            });
          }
        }
      }
    } catch (error) {
      console.warn(`⚠️  Cannot scan directory ${dir}: ${error.message}`);
    }
  }

  // Create comprehensive backup
  createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupSubDir = path.join(this.backupDir, `backup-${timestamp}`);
    
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
    fs.mkdirSync(backupSubDir);

    console.log(`💾 Creating backup of ${this.allFiles.length} files...`);
    
    this.allFiles.forEach(file => {
      const backupPath = path.join(backupSubDir, file.relativePath);
      const backupDir = path.dirname(backupPath);
      
      // Create directory structure
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      
      // Copy file
      try {
        fs.copyFileSync(file.fullPath, backupPath);
      } catch (error) {
        console.warn(`⚠️  Could not backup ${file.relativePath}: ${error.message}`);
      }
    });

    console.log(`✅ Backup created: ${backupSubDir}\n`);
    return backupSubDir;
  }

  // Universal pattern-based replacement system
  getReplacementPatterns() {
    const c = this.config;
    
    return [
      // Contract Addresses - Multiple formats
      {
        name: 'RWA Hub Address',
        patterns: [
          /RWA_HUB:\s*['"](0x[a-fA-F0-9]{40})['"],?/g,
          /RWA_HUB[\s=:]*['"](0x[a-fA-F0-9]{40})['"];?/g,
          /const\s+CONTRACT_ADDRESS\s*=\s*['"](0x[a-fA-F0-9]{40})['"];?/g,
          /CONTRACT_ADDRESS\s*=\s*['"](0x[a-fA-F0-9]{40})['"];?/g,
          /"RWA_HUB":\s*['"](0x[a-fA-F0-9]{40})['"],?/g,
          /NEXT_PUBLIC_RWA_HUB[=:]\s*['"](0x[a-fA-F0-9]{40})['"];?/g
        ],
        replacement: c.contracts?.rwaHub
      },
      {
        name: 'RWA Oracle Address', 
        patterns: [
          /RWA_ORACLE:\s*['"](0x[a-fA-F0-9]{40})['"],?/g,
          /RWA_ORACLE[\s=:]*['"](0x[a-fA-F0-9]{40})['"];?/g,
          /const\s+RWA_ORACLE_ADDRESS\s*=\s*['"](0x[a-fA-F0-9]{40})['"];?/g,
          /RWA_ORACLE_ADDRESS\s*=\s*['"](0x[a-fA-F0-9]{40})['"];?/g,
          /"RWA_ORACLE":\s*['"](0x[a-fA-F0-9]{40})['"],?/g,
          /NEXT_PUBLIC_RWA_ORACLE[=:]\s*['"](0x[a-fA-F0-9]{40})['"];?/g
        ],
        replacement: c.contracts?.rwaOracle
      },
      
      // Network Configuration
      {
        name: 'Chain ID',
        patterns: [
          /chainId:\s*['"](0x[a-fA-F0-9]+)['"],?/g,
          /CHAIN_ID[=:]\s*['"](0x[a-fA-F0-9]+)['"];?/g,
          /"chainId":\s*['"](0x[a-fA-F0-9]+)['"],?/g
        ],
        replacement: c.network?.chainId
      },
      
      // API URLs and Keys  
      {
        name: 'Sepolia RPC URL',
        patterns: [
          /SEPOLIA_URL[=:]\s*['"](https?:\/\/[^'"]+)['"];?/g,
          /url:\s*['"](https?:\/\/sepolia[^'"]+)['"],?/g,
          /"url":\s*['"](https?:\/\/sepolia[^'"]+)['"],?/g,
          /NEXT_PUBLIC_RPC_URL[=:]\s*['"](https?:\/\/[^'"]+)['"];?/g
        ],
        replacement: c.network?.rpcUrl
      },
      {
        name: 'Etherscan API Key',
        patterns: [
          /ETHERSCAN_API_KEY[=:]\s*['"]([^'"]+)['"];?/g,
          /etherscan.*apiKey[=:]\s*['"]([^'"]+)['"];?/g,
          /apiKey:\s*['"]([^'"]+)['"],?\s*\/\/ etherscan/gi
        ],
        replacement: c.api?.etherscanKey
      },
      {
        name: 'Infura Project ID',
        patterns: [
          /INFURA_KEY[=:]\s*['"]([^'"]+)['"];?/g,
          /INFURA_PROJECT_ID[=:]\s*['"]([^'"]+)['"];?/g,
          /infura\.io\/v3\/([a-zA-Z0-9]+)/g
        ],
        replacement: c.api?.infuraKey
      },
      
      // Private Key (be careful with this one)
      {
        name: 'Private Key',
        patterns: [
          /PRIVATE_KEY[=:]\s*['"]([^'"]+)['"];?/g
        ],
        replacement: c.wallet?.privateKey,
        sensitive: true
      }
    ];
  }

  // Apply patterns to a single file
  updateSingleFile(fileInfo) {
    try {
      let content = fs.readFileSync(fileInfo.fullPath, 'utf8');
      const originalContent = content;
      let fileUpdated = false;
      const changes = [];

      const patterns = this.getReplacementPatterns();

      patterns.forEach(({ name, patterns: patternList, replacement, sensitive }) => {
        if (!replacement) return; // Skip if no replacement value provided

        patternList.forEach(pattern => {
          const matches = content.match(pattern);
          if (matches) {
            const newContent = content.replace(pattern, (match, capturedGroup) => {
              // Handle different replacement strategies
              if (sensitive) {
                // For sensitive data, replace the captured group only
                return match.replace(capturedGroup, replacement);
              } else {
                // For addresses, replace the full match with proper formatting
                if (match.includes('RWA_HUB:')) {
                  return `RWA_HUB: '${replacement}',`;
                } else if (match.includes('RWA_ORACLE:')) {
                  return `RWA_ORACLE: '${replacement}',`;
                } else if (match.includes('const CONTRACT_ADDRESS')) {
                  return `const CONTRACT_ADDRESS = '${replacement}';`;
                } else if (match.includes('const RWA_ORACLE_ADDRESS')) {
                  return `const RWA_ORACLE_ADDRESS = '${replacement}';`;
                } else {
                  return match.replace(capturedGroup, replacement);
                }
              }
            });

            if (newContent !== content) {
              content = newContent;
              fileUpdated = true;
              changes.push(name);
            }
          }
        });
      });

      // Special handling for RWA token arrays
      if (this.config.rwaTokens && this.config.rwaTokens.length > 0) {
        const tokenArrayPattern = /const\s+(mockRWATokens|realRWATokens|supportedTokens)\s*=\s*\[[\s\S]*?\];/g;
        
        if (tokenArrayPattern.test(content)) {
          const newTokenArray = `const realRWATokens = [
${this.config.rwaTokens.map(token => `  {
    address: '${token.address}',
    name: '${token.name}',
    symbol: '${token.symbol}',
    type: '${token.type}',
    decimals: ${token.decimals}
  }`).join(',\n')}
];`;

          content = content.replace(tokenArrayPattern, newTokenArray);
          fileUpdated = true;
          changes.push('RWA Token Array');
        }
      }

      // Write file if updated
      if (fileUpdated) {
        fs.writeFileSync(fileInfo.fullPath, content);
        this.updatedFiles.push({
          ...fileInfo,
          changes
        });
        
        const displayPath = fileInfo.relativePath.length > 50 
          ? '...' + fileInfo.relativePath.slice(-47)
          : fileInfo.relativePath;
          
        console.log(`✅ ${displayPath} (${changes.join(', ')})`);
      }

    } catch (error) {
      console.error(`❌ Error updating ${fileInfo.relativePath}: ${error.message}`);
    }
  }

  // Update all files
  updateAllFiles() {
    console.log(`🔄 Scanning and updating ${this.allFiles.length} files...\n`);
    
    this.allFiles.forEach(fileInfo => {
      this.updateSingleFile(fileInfo);
    });

    console.log(`\n📊 Update Summary:`);
    console.log(`   Total files scanned: ${this.allFiles.length}`);
    console.log(`   Files updated: ${this.updatedFiles.length}`);
    console.log(`   Files unchanged: ${this.allFiles.length - this.updatedFiles.length}`);
  }

  // Interactive configuration input
  async promptForConfig() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));

    try {
      console.log('🚀 Universal Project Configuration Updater');
      console.log('   This will scan and update ALL files in your project\n');
      
      // Contracts
      console.log('📋 Smart Contract Addresses:');
      this.config.contracts = {
        rwaHub: await question('  RWA Hub Contract Address: '),
        rwaOracle: await question('  RWA Oracle Contract Address: ')
      };
      
      // Network
      console.log('\n🌐 Network Configuration:');
      this.config.network = {
        chainId: await question('  Chain ID (default 0xaa36a7 for Sepolia): ') || '0xaa36a7',
        rpcUrl: await question('  RPC URL (e.g., Infura/Alchemy): ')
      };
      
      // API Keys
      console.log('\n🔑 API Keys:');
      this.config.api = {
        etherscanKey: await question('  Etherscan API Key (optional): '),
        infuraKey: await question('  Infura Project ID (optional): ')
      };
      
      // Wallet (be careful)
      console.log('\n👛 Wallet Configuration:');
      const updatePrivateKey = await question('  Update private key in .env files? (y/N): ');
      if (updatePrivateKey.toLowerCase() === 'y') {
        this.config.wallet = {
          privateKey: await question('  Private Key (⚠️  SENSITIVE): ')
        };
      }
      
      // RWA Tokens
      console.log('\n🪙 RWA Tokens:');
      const addTokens = await question('  Add RWA token configurations? (y/N): ');
      if (addTokens.toLowerCase() === 'y') {
        const tokenCount = parseInt(await question('  Number of tokens: ')) || 0;
        this.config.rwaTokens = [];
        
        for (let i = 0; i < tokenCount; i++) {
          console.log(`\n  Token ${i + 1}:`);
          const token = {
            address: await question('    Address: '),
            name: await question('    Name: '),
            symbol: await question('    Symbol: '),
            type: await question('    Type: '),
            decimals: parseInt(await question('    Decimals (18): ')) || 18
          };
          this.config.rwaTokens.push(token);
        }
      }

    } finally {
      rl.close();
    }
  }

  // Generate comprehensive report
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      configuration: this.config,
      summary: {
        totalFiles: this.allFiles.length,
        updatedFiles: this.updatedFiles.length,
        unchangedFiles: this.allFiles.length - this.updatedFiles.length
      },
      updatedFiles: this.updatedFiles.map(f => ({
        path: f.relativePath,
        changes: f.changes
      })),
      allScannedFiles: this.allFiles.map(f => f.relativePath)
    };

    const reportPath = path.join(this.projectRoot, 'universal-config-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\n📄 Detailed report saved: universal-config-report.json`);
    return report;
  }

  // Main execution
  async run() {
    try {
      console.log('🔍 Scanning entire project structure...');
      this.scanAllFiles();
      console.log(`📁 Found ${this.allFiles.length} files to scan\n`);

      // Show what will be scanned
      const fileTypes = {};
      this.allFiles.forEach(f => {
        const ext = f.extension || 'no-extension';
        fileTypes[ext] = (fileTypes[ext] || 0) + 1;
      });
      
      console.log('📊 File types to scan:');
      Object.entries(fileTypes)
        .sort(([,a], [,b]) => b - a)
        .forEach(([ext, count]) => {
          console.log(`   ${ext}: ${count} files`);
        });
      
      const proceed = await new Promise(resolve => {
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });
        rl.question('\nProceed with configuration? (Y/n): ', answer => {
          rl.close();
          resolve(answer.toLowerCase() !== 'n');
        });
      });

      if (!proceed) {
        console.log('❌ Configuration cancelled');
        return;
      }

      await this.promptForConfig();

      console.log('\n💾 Creating backup...');
      this.createBackup();

      console.log('🔄 Updating all files...');
      this.updateAllFiles();

      this.generateReport();

      console.log('\n🎉 Universal configuration update completed!');
      console.log('📁 Backup created in .config-backups/');
      console.log('📄 Report saved as universal-config-report.json');
      
    } catch (error) {
      console.error('❌ Universal update failed:', error.message);
      process.exit(1);
    }
  }
}

// Command line execution
if (require.main === module) {
  const updater = new UniversalConfigUpdater();
  updater.run();
}

module.exports = UniversalConfigUpdater;