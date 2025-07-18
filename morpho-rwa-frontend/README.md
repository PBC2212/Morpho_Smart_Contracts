\# Morpho RWA Liquidity Hub Frontend



A Next.js application for interacting with the Morpho RWA Liquidity Hub smart contract, enabling users to borrow USDC against Real World Assets (RWA) as collateral.



\## 🚀 Quick Start



\### Prerequisites



\- Node.js 16+ 

\- MetaMask or compatible Web3 wallet

\- Your deployed Morpho RWA contract address



\### Installation



1\. \*\*Install dependencies:\*\*

```bash

npm install



Configure environment variables:



Copy .env.local and update the contract addresses

Replace 0x123... with your actual deployed contract address

Add your RPC URLs (Alchemy/Infura API keys)





Start development server:



bashnpm run dev



Open your browser:



Navigate to http://localhost:3000

Connect your Web3 wallet

Interact with the RWA Liquidity Hub







📁 Project Structure

morpho-rwa-frontend/

├── pages/

│   ├── \_app.tsx          # App wrapper with global styles

│   └── index.tsx         # Main dashboard page

├── styles/

│   └── globals.css       # Global styles and Tailwind

├── types/

│   └── index.ts          # TypeScript type definitions

├── utils/

│   └── index.ts          # Utility functions and helpers

├── .env.local            # Environment variables

├── package.json          # Dependencies and scripts

├── tailwind.config.js    # Tailwind CSS configuration

├── tsconfig.json         # TypeScript configuration

└── next.config.js        # Next.js configuration

⚙️ Configuration

Environment Variables

Update .env.local with your specific values:

env# Your deployed contract address (REQUIRED)

NEXT\_PUBLIC\_MORPHO\_RWA\_CONTRACT\_ADDRESS=0xYourContractAddress



\# RPC URLs for contract calls (OPTIONAL but recommended)

NEXT\_PUBLIC\_ETHEREUM\_RPC\_URL=https://eth-mainnet.alchemyapi.io/v2/YOUR\_API\_KEY

NEXT\_PUBLIC\_BASE\_RPC\_URL=https://base-mainnet.g.alchemy.com/v2/YOUR\_API\_KEY



\# Feature flags

NEXT\_PUBLIC\_MOCK\_DATA=true    # Set to false for production

NEXT\_PUBLIC\_ENABLE\_TESTNET=true

Network Support

Currently configured for:



Ethereum Mainnet (0x1)

Base Mainnet (0x2105)

Sepolia Testnet (0xaa36a7)

Base Sepolia (0x14a33)



🔗 Smart Contract Integration

Current State: Demo Mode

The application currently uses mock data for demonstration. To integrate with your real contract:

Step 1: Update Contract Address

typescript// In .env.local

NEXT\_PUBLIC\_MORPHO\_RWA\_CONTRACT\_ADDRESS=0xYourRealContractAddress

NEXT\_PUBLIC\_MOCK\_DATA=false

Step 2: Implement Real Contract Calls

Replace the mock functions in pages/index.tsx:

typescript// Replace this mock function:

const fetchPositionData = async () => {

&nbsp; // Mock data...

};



// With real contract calls:

const fetchPositionData = async () => {

&nbsp; if (!selectedRWA || !account) return;

&nbsp; 

&nbsp; try {

&nbsp;   const result = await window.ethereum.request({

&nbsp;     method: 'eth\_call',

&nbsp;     params: \[{

&nbsp;       to: CONTRACT\_ADDRESS,

&nbsp;       data: encodeFunctionCall('getPositionAnalytics', \[account, selectedRWA], MORPHO\_RWA\_ABI)

&nbsp;     }, 'latest']

&nbsp;   });

&nbsp;   

&nbsp;   // Decode result and update state

&nbsp;   const decodedData = decodeABIResult(result);

&nbsp;   setPositionData(decodedData);

&nbsp; } catch (error) {

&nbsp;   console.error('Error fetching position:', error);

&nbsp; }

};

Step 3: Add Token Approvals

Before users can supply collateral, they need to approve the RWA token:

typescriptconst approveToken = async (tokenAddress: string, amount: bigint) => {

&nbsp; const approveData = encodeFunctionCall('approve', \[CONTRACT\_ADDRESS, amount], ERC20\_ABI);

&nbsp; 

&nbsp; await window.ethereum.request({

&nbsp;   method: 'eth\_sendTransaction',

&nbsp;   params: \[{

&nbsp;     from: account,

&nbsp;     to: tokenAddress,

&nbsp;     data: approveData,

&nbsp;   }]

&nbsp; });

};

🛡️ Security Considerations

For Production Use:



Test Everything on Testnets First



Deploy contracts to Sepolia/Base Sepolia

Test all functions with small amounts

Verify KYC integration works





Implement Proper ABI Encoding



Use libraries like ethers.js for production

Current implementation is simplified for demo





Add Transaction Monitoring



Show pending transactions

Handle failed transactions gracefully

Display gas estimates





Implement Error Handling



User-friendly error messages

Network switching prompts

Wallet connection recovery







📊 Features

Current Features ✅



Wallet connection (MetaMask compatible)

Network detection and switching

Position analytics display

Supply collateral \& borrow interface

Health factor monitoring

Responsive design

TypeScript support



Production Ready Features 🔄



Real contract integration

Token approval flows

Transaction history

Liquidation monitoring

Admin functions

Error boundaries



🔧 Development

Available Scripts

bashnpm run dev          # Start development server

npm run build        # Build for production

npm run start        # Start production server

npm run lint         # Run ESLint

Adding New Features



New Components: Create in components/ directory

New Pages: Add to pages/ directory

Utility Functions: Add to utils/index.ts

Type Definitions: Add to types/index.ts



🚨 Important Notes

Mock vs Real Data

The application currently shows mock position data. When you see:



Collateral Value: $50,000

Borrowed: $25,000

Health Factor: 2.0



This is demo data! Update NEXT\_PUBLIC\_MOCK\_DATA=false and implement real contract calls for production.

Gas Optimization

For production, implement:



Gas estimation before transactions

Gas price optimization

Batch transactions where possible



User Experience

Consider adding:



Loading states for all operations

Toast notifications for transactions

Progressive Web App (PWA) features

Dark mode toggle



🔗 Integration with Your Smart Contract

Your MorphoRWALiquidityHub.sol contract provides these key functions:

solidity// Main user functions

function supplyCollateralAndBorrow(address rwaToken, uint256 collateralAmount, uint256 borrowAmount)

function repayAndWithdraw(address rwaToken, uint256 repayAmount, uint256 withdrawAmount, bool fullRepayment)

function addCollateral(address rwaToken, uint256 amount)



// View functions

function getPositionAnalytics(address user, address rwaToken) 

function getSupportedRWATokens()

function getAvailableBorrowCapacity(address user, address rwaToken)

Map these to your frontend by implementing proper ABI encoding and decoding.

📈 Next Steps



Deploy \& Test on Testnet



Deploy your smart contract to Sepolia

Update contract address in .env.local

Test with small amounts





Implement Real Contract Integration



Replace mock data with real contract calls

Add proper error handling

Implement token approvals





Add Advanced Features



Transaction history

Liquidation alerts

Portfolio analytics

Admin dashboard





Production Deployment



Deploy to Vercel/Netlify

Configure production environment

Set up monitoring and analytics







🆘 Troubleshooting

Common Issues:

"Please install MetaMask"



Install MetaMask browser extension

Refresh the page



"Unsupported network"



Switch to Ethereum, Base, or Sepolia in MetaMask

Check network configuration in types/index.ts



"Transaction failed"



Check gas limits in utils/index.ts

Verify contract address is correct

Ensure sufficient ETH for gas fees



📝 License

MIT License - See LICENSE file for details.



⚠️ Important: This is currently in demo mode with mock data. Update contract addresses and implement real contract integration before using with real funds.



Copy this file and paste it as `README.md` in your `morpho-rwa-frontend` directory root, then say "done".

