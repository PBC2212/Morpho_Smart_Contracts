// utils/web3.ts
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES } from './index';

// ERC20 ABI for token approvals
export const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
  "function name() external view returns (string)"
];

// Morpho RWA Contract ABI (expanded)
export const MORPHO_RWA_ABI = [
  {
    "inputs": [
      {"name": "rwaToken", "type": "address"},
      {"name": "collateralAmount", "type": "uint256"},
      {"name": "borrowAmount", "type": "uint256"}
    ],
    "name": "supplyCollateralAndBorrow",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "rwaToken", "type": "address"},
      {"name": "repayAmount", "type": "uint256"},
      {"name": "withdrawAmount", "type": "uint256"},
      {"name": "fullRepayment", "type": "bool"}
    ],
    "name": "repayAndWithdraw",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "user", "type": "address"}, {"name": "rwaToken", "type": "address"}],
    "name": "getPositionAnalytics",
    "outputs": [
      {"name": "collateralAmount", "type": "uint256"},
      {"name": "collateralValueUSD", "type": "uint256"},
      {"name": "borrowedAssets", "type": "uint256"},
      {"name": "borrowedValueUSD", "type": "uint256"},
      {"name": "healthFactor", "type": "uint256"},
      {"name": "currentLTV", "type": "uint256"},
      {"name": "liquidationPrice", "type": "uint256"},
      {"name": "availableToBorrow", "type": "uint256"},
      {"name": "availableToWithdraw", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getSupportedRWATokens",
    "outputs": [{"name": "", "type": "address[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "user", "type": "address"}],
    "name": "getUserPositionInfo",
    "outputs": [
      {"name": "totalCollateralUSD", "type": "uint256"},
      {"name": "totalBorrowedUSD", "type": "uint256"},
      {"name": "healthFactor", "type": "uint256"},
      {"name": "lastUpdate", "type": "uint256"},
      {"name": "isActive", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

// Get Web3 Provider
export const getProvider = (): ethers.BrowserProvider | null => {
  if (typeof window !== 'undefined' && window.ethereum) {
    return new ethers.BrowserProvider(window.ethereum);
  }
  return null;
};

// Get Signer
export const getSigner = async (): Promise<ethers.JsonRpcSigner | null> => {
  const provider = getProvider();
  if (!provider) return null;
  
  try {
    return await provider.getSigner();
  } catch (error) {
    console.error('Error getting signer:', error);
    return null;
  }
};

// Get Contract Instance
export const getMorphoContract = async (): Promise<ethers.Contract | null> => {
  const signer = await getSigner();
  if (!signer) return null;
  
  return new ethers.Contract(
    CONTRACT_ADDRESSES.RWA_HUB,
    MORPHO_RWA_ABI,
    signer
  );
};

// Get ERC20 Token Contract
export const getTokenContract = async (tokenAddress: string): Promise<ethers.Contract | null> => {
  const signer = await getSigner();
  if (!signer) return null;
  
  return new ethers.Contract(tokenAddress, ERC20_ABI, signer);
};

// Check Token Allowance
export const checkTokenAllowance = async (
  tokenAddress: string,
  ownerAddress: string,
  spenderAddress: string
): Promise<bigint> => {
  try {
    const tokenContract = await getTokenContract(tokenAddress);
    if (!tokenContract) return 0n;
    
    const allowance = await tokenContract.allowance(ownerAddress, spenderAddress);
    return BigInt(allowance.toString());
  } catch (error) {
    console.error('Error checking allowance:', error);
    return 0n;
  }
};

// Approve Token Spending
export const approveToken = async (
  tokenAddress: string,
  spenderAddress: string,
  amount: bigint
): Promise<ethers.TransactionResponse | null> => {
  try {
    const tokenContract = await getTokenContract(tokenAddress);
    if (!tokenContract) throw new Error('Could not get token contract');
    
    const tx = await tokenContract.approve(spenderAddress, amount.toString());
    return tx;
  } catch (error) {
    console.error('Error approving token:', error);
    throw error;
  }
};

// Get Token Balance
export const getTokenBalance = async (
  tokenAddress: string,
  userAddress: string
): Promise<bigint> => {
  try {
    const provider = getProvider();
    if (!provider) return 0n;
    
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    const balance = await tokenContract.balanceOf(userAddress);
    return BigInt(balance.toString());
  } catch (error) {
    console.error('Error getting token balance:', error);
    return 0n;
  }
};

// Get Token Info
export const getTokenInfo = async (tokenAddress: string): Promise<{
  name: string;
  symbol: string;
  decimals: number;
} | null> => {
  try {
    const provider = getProvider();
    if (!provider) return null;
    
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    
    const [name, symbol, decimals] = await Promise.all([
      tokenContract.name(),
      tokenContract.symbol(),
      tokenContract.decimals()
    ]);
    
    return {
      name,
      symbol,
      decimals: Number(decimals)
    };
  } catch (error) {
    console.error('Error getting token info:', error);
    return null;
  }
};

// Format Transaction Error
export const formatTransactionError = (error: any): string => {
  if (error.code === 'ACTION_REJECTED') {
    return 'Transaction was rejected by user';
  }
  
  if (error.code === 'INSUFFICIENT_FUNDS') {
    return 'Insufficient funds for transaction';
  }
  
  if (error.message?.includes('execution reverted')) {
    // Extract revert reason if available
    const match = error.message.match(/execution reverted: (.+)/);
    if (match) {
      return `Transaction failed: ${match[1]}`;
    }
    return 'Transaction failed: Contract execution reverted';
  }
  
  if (error.message?.includes('user rejected')) {
    return 'Transaction was rejected by user';
  }
  
  // Generic fallback
  return error.message || 'Transaction failed';
};

// Estimate Gas for Transaction
export const estimateGas = async (
  contract: ethers.Contract,
  method: string,
  params: any[]
): Promise<bigint> => {
  try {
    const gasEstimate = await contract[method].estimateGas(...params);
    // Add 20% buffer
    return (BigInt(gasEstimate.toString()) * 120n) / 100n;
  } catch (error) {
    console.error('Error estimating gas:', error);
    // Return a reasonable default
    return 500000n;
  }
};

// Wait for Transaction Confirmation
export const waitForTransaction = async (
  txHash: string,
  confirmations: number = 1
): Promise<ethers.TransactionReceipt | null> => {
  try {
    const provider = getProvider();
    if (!provider) return null;
    
    const receipt = await provider.waitForTransaction(txHash, confirmations);
    return receipt;
  } catch (error) {
    console.error('Error waiting for transaction:', error);
    return null;
  }
};