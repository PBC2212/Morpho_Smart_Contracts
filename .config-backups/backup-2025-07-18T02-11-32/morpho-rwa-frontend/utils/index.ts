import { 
  Address, 
  Hash, 
  PositionAnalytics, 
  TransactionRequest, 
  HealthFactorStatus,
  HEALTH_FACTOR_THRESHOLDS,
  DECIMAL_PRECISION,
  SUPPORTED_NETWORKS
} from '@/types';

// ============ BIG NUMBER UTILITIES ============

/**
 * Convert a string or number to BigInt with specified decimals
 */
export const toBigInt = (value: string | number, decimals: number = 18): bigint => {
  if (!value || value === '') return 0n;
  
  const [integer, fraction = ''] = value.toString().split('.');
  const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
  return BigInt(integer + paddedFraction);
};

/**
 * Format BigInt to human-readable string with specified decimal places
 */
export const formatBigInt = (
  value: bigint | undefined | null, 
  decimals: number = 18, 
  displayDecimals: number = 2
): string => {
  if (!value || value === 0n) return '0';
  
  const divisor = 10n ** BigInt(decimals);
  const quotient = value / divisor;
  const remainder = value % divisor;
  
  if (displayDecimals === 0) return quotient.toString();
  
  const fractionString = remainder.toString().padStart(decimals, '0');
  const truncatedFraction = fractionString.slice(0, displayDecimals);
  
  return `${quotient}.${truncatedFraction}`;
};

/**
 * Format number as currency with proper commas and decimals
 */
export const formatCurrency = (
  value: string | number | bigint, 
  decimals: number = 18,
  currency: string = '$'
): string => {
  let numericValue: number;
  
  if (typeof value === 'bigint') {
    numericValue = Number(formatBigInt(value, decimals, 2));
  } else {
    numericValue = Number(value);
  }
  
  if (isNaN(numericValue)) return `${currency}0.00`;
  
  return `${currency}${numericValue.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};

/**
 * Format percentage with proper decimals
 */
export const formatPercentage = (
  value: bigint | number, 
  inputDecimals: number = 4,
  displayDecimals: number = 1
): string => {
  let percentage: number;
  
  if (typeof value === 'bigint') {
    percentage = Number(formatBigInt(value, inputDecimals, 4)) * 100;
  } else {
    percentage = value * 100;
  }
  
  return `${percentage.toFixed(displayDecimals)}%`;
};

// ============ HEALTH FACTOR UTILITIES ============

/**
 * Get health factor status with color and message
 */
export const getHealthFactorStatus = (healthFactor: bigint): HealthFactorStatus => {
  const hf = Number(formatBigInt(healthFactor, DECIMAL_PRECISION.HEALTH_FACTOR, 2));
  
  if (hf >= HEALTH_FACTOR_THRESHOLDS.SAFE) {
    return {
      value: hf,
      status: 'safe',
      color: 'text-green-600',
      message: 'Your position is safe'
    };
  } else if (hf >= HEALTH_FACTOR_THRESHOLDS.WARNING) {
    return {
      value: hf,
      status: 'warning',
      color: 'text-yellow-600',
      message: 'Monitor your position closely'
    };
  } else {
    return {
      value: hf,
      status: 'danger',
      color: 'text-red-600',
      message: 'Risk of liquidation!'
    };
  }
};

/**
 * Check if position is liquidatable
 */
export const isLiquidatable = (healthFactor: bigint): boolean => {
  const hf = Number(formatBigInt(healthFactor, DECIMAL_PRECISION.HEALTH_FACTOR, 2));
  return hf < HEALTH_FACTOR_THRESHOLDS.LIQUIDATION;
};

/**
 * Calculate liquidation price for RWA token
 */
export const calculateLiquidationPrice = (
  collateralAmount: bigint,
  borrowedValueUSD: bigint,
  liquidationThreshold: number = HEALTH_FACTOR_THRESHOLDS.LIQUIDATION
): bigint => {
  if (collateralAmount === 0n) return 0n;
  
  const liquidationValueUSD = (borrowedValueUSD * BigInt(Math.floor(liquidationThreshold * 10000))) / 10000n;
  return liquidationValueUSD / collateralAmount;
};

// ============ NETWORK UTILITIES ============

/**
 * Get network information by chain ID
 */
export const getNetworkInfo = (chainId: string) => {
  return SUPPORTED_NETWORKS[chainId] || null;
};

/**
 * Check if network is supported
 */
export const isSupportedNetwork = (chainId: string): boolean => {
  return chainId in SUPPORTED_NETWORKS;
};

/**
 * Get block explorer URL for transaction
 */
export const getBlockExplorerUrl = (chainId: string, txHash: string): string => {
  const network = getNetworkInfo(chainId);
  if (!network) return '';
  return `${network.blockExplorer}/tx/${txHash}`;
};

/**
 * Get block explorer URL for address
 */
export const getAddressExplorerUrl = (chainId: string, address: string): string => {
  const network = getNetworkInfo(chainId);
  if (!network) return '';
  return `${network.blockExplorer}/address/${address}`;
};

// ============ CONTRACT UTILITIES ============

/**
 * Create basic function selector from function signature
 */
export const getFunctionSelector = (signature: string): string => {
  // This is a simplified implementation
  // In production, use a proper keccak256 implementation
  const hash = signature.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  return `0x${Math.abs(hash).toString(16).padStart(8, '0').slice(0, 8)}`;
};

/**
 * Encode function call data (simplified)
 */
export const encodeFunctionCall = (
  functionName: string, 
  params: any[], 
  abi: any[]
): string => {
  const func = abi.find(f => f.name === functionName);
  if (!func) throw new Error(`Function ${functionName} not found`);
  
  const signature = `${functionName}(${func.inputs.map((i: any) => i.type).join(',')})`;
  const selector = getFunctionSelector(signature);
  
  // In production, implement proper ABI encoding
  return selector;
};

/**
 * Estimate gas for transaction
 */
export const estimateGas = async (
  transaction: TransactionRequest,
  ethereum: any
): Promise<string> => {
  try {
    const gasEstimate = await ethereum.request({
      method: 'eth_estimateGas',
      params: [transaction]
    });
    
    // Add 20% buffer
    const gasWithBuffer = Math.floor(parseInt(gasEstimate, 16) * 1.2);
    return `0x${gasWithBuffer.toString(16)}`;
  } catch (error) {
    console.error('Gas estimation failed:', error);
    return '0x493e0'; // Default 300k gas
  }
};

// ============ VALIDATION UTILITIES ============

/**
 * Validate Ethereum address
 */
export const isValidAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

/**
 * Validate transaction hash
 */
export const isValidTxHash = (hash: string): boolean => {
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
};

/**
 * Validate numeric input
 */
export const isValidNumber = (value: string): boolean => {
  if (!value || value === '') return false;
  const num = Number(value);
  return !isNaN(num) && num >= 0 && isFinite(num);
};

/**
 * Validate collateral amount
 */
export const validateCollateralAmount = (
  amount: string,
  minCollateral: bigint = 0n,
  maxCollateral: bigint = 0n
): string | null => {
  if (!isValidNumber(amount)) {
    return 'Please enter a valid amount';
  }
  
  const amountBigInt = toBigInt(amount, 18);
  
  if (minCollateral > 0n && amountBigInt < minCollateral) {
    return `Minimum collateral is ${formatBigInt(minCollateral, 18, 2)}`;
  }
  
  if (maxCollateral > 0n && amountBigInt > maxCollateral) {
    return `Maximum collateral is ${formatBigInt(maxCollateral, 18, 2)}`;
  }
  
  return null;
};

/**
 * Validate borrow amount against LTV
 */
export const validateBorrowAmount = (
  borrowAmount: string,
  collateralValueUSD: bigint,
  maxLTV: bigint
): string | null => {
  if (!isValidNumber(borrowAmount)) {
    return 'Please enter a valid borrow amount';
  }
  
  const borrowAmountUSD = toBigInt(borrowAmount, DECIMAL_PRECISION.USDC) * BigInt(1e12); // Convert USDC to 18 decimals
  const maxBorrowUSD = (collateralValueUSD * maxLTV) / 10000n;
  
  if (borrowAmountUSD > maxBorrowUSD) {
    return `Maximum borrow amount is $${formatBigInt(maxBorrowUSD, 18, 2)}`;
  }
  
  return null;
};

// ============ FORMATTING UTILITIES ============

/**
 * Truncate address for display
 */
export const truncateAddress = (address: string, startLength: number = 6, endLength: number = 4): string => {
  if (!address || address.length < startLength + endLength) return address;
  return `${address.slice(0, startLength)}...${address.slice(-endLength)}`;
};

/**
 * Format time ago
 */
export const formatTimeAgo = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'Just now';
};

/**
 * Format duration
 */
export const formatDuration = (seconds: number): string => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

// ============ CALCULATION UTILITIES ============

/**
 * Calculate current LTV ratio
 */
export const calculateLTV = (borrowedValueUSD: bigint, collateralValueUSD: bigint): bigint => {
  if (collateralValueUSD === 0n) return 0n;
  return (borrowedValueUSD * 10000n) / collateralValueUSD;
};

/**
 * Calculate available borrow capacity
 */
export const calculateAvailableBorrow = (
  collateralValueUSD: bigint,
  currentBorrowUSD: bigint,
  maxLTV: bigint,
  safetyBuffer: number = 0.95
): bigint => {
  const maxBorrowUSD = (collateralValueUSD * maxLTV) / 10000n;
  const safeBorrowUSD = (maxBorrowUSD * BigInt(Math.floor(safetyBuffer * 10000))) / 10000n;
  
  if (safeBorrowUSD > currentBorrowUSD) {
    return safeBorrowUSD - currentBorrowUSD;
  }
  
  return 0n;
};

/**
 * Calculate position health after additional borrow
 */
export const calculateHealthAfterBorrow = (
  currentCollateralUSD: bigint,
  currentBorrowUSD: bigint,
  additionalBorrowUSD: bigint
): bigint => {
  const newBorrowUSD = currentBorrowUSD + additionalBorrowUSD;
  if (newBorrowUSD === 0n) return BigInt(Number.MAX_SAFE_INTEGER);
  
  return (currentCollateralUSD * 10000n) / newBorrowUSD;
};

// ============ ERROR HANDLING UTILITIES ============

/**
 * Parse Web3 error message
 */
export const parseWeb3Error = (error: any): string => {
  if (error?.code === 4001) {
    return 'Transaction was rejected by user';
  }
  
  if (error?.code === -32603) {
    return 'Internal JSON-RPC error';
  }
  
  if (error?.message?.includes('insufficient funds')) {
    return 'Insufficient funds for gas fee';
  }
  
  if (error?.message?.includes('user rejected')) {
    return 'Transaction rejected by user';
  }
  
  if (error?.reason) {
    return error.reason;
  }
  
  if (error?.message) {
    return error.message;
  }
  
  return 'Unknown error occurred';
};

/**
 * Generate unique ID for notifications/transactions
 */
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// ============ STORAGE UTILITIES ============

/**
 * Safe localStorage operations
 */
export const storage = {
  get: (key: string): any => {
    try {
      if (typeof window === 'undefined') return null;
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  },
  
  set: (key: string, value: any): void => {
    try {
      if (typeof window === 'undefined') return;
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore storage errors
    }
  },
  
  remove: (key: string): void => {
    try {
      if (typeof window === 'undefined') return;
      localStorage.removeItem(key);
    } catch {
      // Ignore storage errors
    }
  }
};

// ============ DEPLOYED CONTRACT ADDRESSES ============

export const CONTRACT_ADDRESSES = {
  // ✅ DEPLOYED ON SEPOLIA TESTNET
  RWA_ORACLE: process.env.NEXT_PUBLIC_RWA_ORACLE_ADDRESS || '0x0403F1a45e538eebF887afD1f7318fA3255f1273',
  RWA_HUB: process.env.NEXT_PUBLIC_MORPHO_RWA_CONTRACT_ADDRESS || '0xC085e5E50872D597DE3e3195C74ca953e4a3851A',
  
  // Morpho Blue Protocol Addresses
  MORPHO_ETHEREUM: process.env.NEXT_PUBLIC_MORPHO_ETHEREUM || '0xbBbBBBbbBB9Cc5E90E3b6CA6c44b5a4e4a791BCf',
  MORPHO_BASE: process.env.NEXT_PUBLIC_MORPHO_BASE || '0xbBbBBBbbBB9Cc5E90E3b6CA6c44b5a4e4a791BCf',
  
  // Token Addresses
  USDC_ETHEREUM: process.env.NEXT_PUBLIC_USDC_ETHEREUM_ADDRESS || '0xA0b86a33E6441bB1563F9E6fb7b8e5B9A1e1B7D8',
  USDC_BASE: process.env.NEXT_PUBLIC_USDC_BASE_ADDRESS || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
};

// ============ NETWORK-SPECIFIC CONTRACT HELPERS ============

/**
 * Get contract address for current network
 */
export const getContractAddress = (contractName: keyof typeof CONTRACT_ADDRESSES, chainId?: string): string => {
  return CONTRACT_ADDRESSES[contractName] || '';
};

/**
 * Get Morpho Blue address for network
 */
export const getMorphoAddress = (chainId: string): string => {
  switch (chainId) {
    case '1': // Ethereum Mainnet
      return CONTRACT_ADDRESSES.MORPHO_ETHEREUM;
    case '8453': // Base
      return CONTRACT_ADDRESSES.MORPHO_BASE;
    case '11155111': // Sepolia (use Ethereum address)
      return CONTRACT_ADDRESSES.MORPHO_ETHEREUM;
    default:
      return CONTRACT_ADDRESSES.MORPHO_ETHEREUM;
  }
};

/**
 * Get USDC address for network
 */
export const getUSDCAddress = (chainId: string): string => {
  switch (chainId) {
    case '1': // Ethereum Mainnet
      return CONTRACT_ADDRESSES.USDC_ETHEREUM;
    case '8453': // Base
      return CONTRACT_ADDRESSES.USDC_BASE;
    case '11155111': // Sepolia (use a testnet USDC)
      return '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'; // Sepolia USDC
    default:
      return CONTRACT_ADDRESSES.USDC_ETHEREUM;
  }
};

// ============ DEFAULT SETTINGS ============

export const DEFAULT_SETTINGS = {
  REFRESH_INTERVAL: Number(process.env.NEXT_PUBLIC_REFRESH_INTERVAL) || 30000,
  TRANSACTION_TIMEOUT: Number(process.env.NEXT_PUBLIC_TRANSACTION_TIMEOUT) || 300000,
  SLIPPAGE_TOLERANCE: 0.005, // 0.5%
  GAS_PRICE_MULTIPLIER: Number(process.env.NEXT_PUBLIC_GAS_PRICE_MULTIPLIER) || 1.1,
};

// ============ DEPLOYMENT INFO ============

export const DEPLOYMENT_INFO = {
  NETWORK: 'Sepolia Testnet',
  CHAIN_ID: '11155111',
  DEPLOYED_BLOCK: Date.now(), // Replace with actual deployment block if needed
  DEPLOYER: '0x9579E8293E5DEA6e493067695BCd1D913757e441',
  VERSION: '1.0.0',
};