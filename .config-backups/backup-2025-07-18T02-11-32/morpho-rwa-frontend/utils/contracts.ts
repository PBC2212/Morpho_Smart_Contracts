import { CONTRACT_ADDRESSES } from './index';

// Import the ABIs
import MorphoRWALiquidityHubABI from '../contracts/MorphoRWALiquidityHub.json';
import RWAOracleABI from '../contracts/RWAOracle.json';

// Contract configuration
export const CONTRACTS = {
  RWA_HUB: {
    address: CONTRACT_ADDRESSES.RWA_HUB,
    abi: MorphoRWALiquidityHubABI.abi,
  },
  RWA_ORACLE: {
    address: CONTRACT_ADDRESSES.RWA_ORACLE,
    abi: RWAOracleABI.abi,
  },
};

// Helper function to get contract instance
export const getContract = (contractName: keyof typeof CONTRACTS, ethereum: any) => {
  const contract = CONTRACTS[contractName];
  if (!contract) {
    throw new Error(`Contract ${contractName} not found`);
  }
  
  return {
    address: contract.address,
    abi: contract.abi,
    // Add web3 instance creation here when implementing
  };
};

// Contract interaction functions
export const contractInteractions = {
  // Supply collateral and borrow
  supplyCollateralAndBorrow: async (
    rwaToken: string,
    collateralAmount: string,
    borrowAmount: string,
    account: string,
    ethereum: any
  ) => {
    const contract = getContract('RWA_HUB', ethereum);
    
    // TODO: Implement actual contract call
    console.log('Calling supplyCollateralAndBorrow:', {
      contract: contract.address,
      rwaToken,
      collateralAmount,
      borrowAmount,
      account
    });
    
    // Return mock transaction hash for now
    return `0x${Math.random().toString(16).slice(2)}`;
  },

  // Get position analytics
  getPositionAnalytics: async (
    userAddress: string,
    rwaToken: string,
    ethereum: any
  ) => {
    const contract = getContract('RWA_HUB', ethereum);
    
    // TODO: Implement actual contract call
    console.log('Calling getPositionAnalytics:', {
      contract: contract.address,
      userAddress,
      rwaToken
    });
    
    // Return mock data for now
    return {
      collateralAmount: '1000000000000000000000', // 1000 tokens
      collateralValueUSD: '50000000000000000000000', // $50,000
      borrowedAssets: '25000000000', // 25,000 USDC (6 decimals)
      borrowedValueUSD: '25000000000000000000000', // $25,000
      healthFactor: '20000', // 2.0 (4 decimals)
      currentLTV: '5000', // 50% (4 decimals)
      liquidationPrice: '40000000000000000000000', // $40,000
      availableToBorrow: '15000000000', // 15,000 USDC
      availableToWithdraw: '500000000000000000000' // 500 tokens
    };
  },

  // Get supported RWA tokens
  getSupportedRWATokens: async (ethereum: any) => {
    const contract = getContract('RWA_HUB', ethereum);
    
    // TODO: Implement actual contract call
    console.log('Calling getSupportedRWATokens:', {
      contract: contract.address
    });
    
    // Return mock tokens for now
    return [
      '0x742d35Cc6Bf32f9B1C9c85c5e8C8f0d8Ba1F7B95',
      '0x853d955aCEf822Db058eb8505911ED77F175b99e',
      '0x956F47F50A910163D8BF957Cf5846D573E7f87CA'
    ];
  }
};

// Validation helpers
export const validateTransaction = {
  supplyCollateralAndBorrow: (
    rwaToken: string,
    collateralAmount: string,
    borrowAmount: string
  ) => {
    if (!rwaToken || rwaToken === '') {
      throw new Error('RWA token address is required');
    }
    
    if (!collateralAmount || Number(collateralAmount) <= 0) {
      throw new Error('Collateral amount must be greater than 0');
    }
    
    if (!borrowAmount || Number(borrowAmount) <= 0) {
      throw new Error('Borrow amount must be greater than 0');
    }
    
    return true;
  }
};

// Network helpers
export const networkHelpers = {
  isSepoliaNetwork: (chainId: string) => {
    return chainId === '0xaa36a7' || chainId === '11155111';
  },
  
  getSepoliaRPC: () => {
    return 'https://sepolia.infura.io/v3/';
  },
  
  getExplorerUrl: (txHash: string) => {
    return `https://sepolia.etherscan.io/tx/${txHash}`;
  }
};