// Wallet and Web3 Types
export interface WalletState {
  account: string;
  isConnected: boolean;
  chainId: string;
  isLoading: boolean;
}

export interface NetworkInfo {
  chainId: string;
  name: string;
  symbol: string;
  rpcUrl: string;
  blockExplorer: string;
  isTestnet: boolean;
}

// Contract Types
export interface RWAConfig {
  isSupported: boolean;
  name: string;
  assetType: string;
  oracle: string;
  irm: string;
  lltv: bigint;
  minCollateral: bigint;
  maxSinglePosition: bigint;
  decimals: number;
  requiresKYC: boolean;
  isActive: boolean;
}

export interface RWAToken {
  address: string;
  name: string;
  symbol: string;
  type: string;
  decimals: number;
  isActive: boolean;
  config?: RWAConfig;
}

export interface MarketParams {
  loanToken: string;
  collateralToken: string;
  oracle: string;
  irm: string;
  lltv: bigint;
}

export interface Position {
  supplyShares: bigint;
  borrowShares: bigint;
  collateral: bigint;
}

export interface Market {
  totalSupplyAssets: bigint;
  totalSupplyShares: bigint;
  totalBorrowAssets: bigint;
  totalBorrowShares: bigint;
  lastUpdate: bigint;
  fee: bigint;
}

export interface UserPosition {
  totalCollateralUSD: bigint;
  totalBorrowedUSD: bigint;
  healthFactor: bigint;
  lastUpdate: bigint;
  isActive: boolean;
}

export interface PositionAnalytics {
  collateralAmount: bigint;
  collateralValueUSD: bigint;
  borrowedAssets: bigint;
  borrowedValueUSD: bigint;
  healthFactor: bigint;
  currentLTV: bigint;
  liquidationPrice: bigint;
  availableToBorrow: bigint;
  availableToWithdraw: bigint;
}

// Transaction Types
export interface TransactionRequest {
  to: string;
  data: string;
  value?: string;
  gas?: string;
  gasPrice?: string;
}

export interface TransactionReceipt {
  transactionHash: string;
  blockNumber: number;
  blockHash: string;
  gasUsed: string;
  status: string;
}

export interface PendingTransaction {
  hash: string;
  type: 'supply' | 'borrow' | 'repay' | 'withdraw' | 'liquidate';
  timestamp: number;
  description: string;
}

// UI State Types
export interface FormState {
  selectedRWA: string;
  collateralAmount: string;
  borrowAmount: string;
  repayAmount: string;
  withdrawAmount: string;
  isValid: boolean;
  errors: Record<string, string>;
}

export interface NotificationState {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: number;
  isVisible: boolean;
}

// API Response Types
export interface ContractCallResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  transactionHash?: string;
}

export interface HealthFactorStatus {
  value: number;
  status: 'safe' | 'warning' | 'danger';
  color: string;
  message: string;
}

// Contract Function Types
export interface SupplyCollateralAndBorrowParams {
  rwaToken: string;
  collateralAmount: bigint;
  borrowAmount: bigint;
}

export interface RepayAndWithdrawParams {
  rwaToken: string;
  repayAmount: bigint;
  withdrawAmount: bigint;
  fullRepayment: boolean;
}

export interface LiquidatePositionParams {
  borrower: string;
  rwaToken: string;
  seizedAssets: bigint;
  repaidShares: bigint;
}

// Event Types
export interface ContractEvent {
  eventName: string;
  blockNumber: number;
  transactionHash: string;
  args: Record<string, any>;
}

export interface InstantLiquidityProvidedEvent extends ContractEvent {
  args: {
    user: string;
    rwaToken: string;
    collateralAmount: bigint;
    borrowedAmount: bigint;
    platformFee: bigint;
  };
}

export interface PositionLiquidatedEvent extends ContractEvent {
  args: {
    borrower: string;
    liquidator: string;
    rwaToken: string;
    collateralSeized: bigint;
    debtRepaid: bigint;
  };
}

// Constants and Configuration
export const SUPPORTED_NETWORKS: Record<string, NetworkInfo> = {
  '0x1': {
    chainId: '0x1',
    name: 'Ethereum',
    symbol: 'ETH',
    rpcUrl: 'https://eth-mainnet.alchemyapi.io/v2/',
    blockExplorer: 'https://etherscan.io',
    isTestnet: false,
  },
  '0x2105': {
    chainId: '0x2105',
    name: 'Base',
    symbol: 'ETH',
    rpcUrl: 'https://base-mainnet.g.alchemy.com/v2/',
    blockExplorer: 'https://basescan.org',
    isTestnet: false,
  },
  '0xaa36a7': {
    chainId: '0xaa36a7',
    name: 'Sepolia',
    symbol: 'ETH',
    rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/',
    blockExplorer: 'https://sepolia.etherscan.io',
    isTestnet: true,
  },
  '0x14a33': {
    chainId: '0x14a33',
    name: 'Base Sepolia',
    symbol: 'ETH',
    rpcUrl: 'https://base-sepolia.g.alchemy.com/v2/',
    blockExplorer: 'https://sepolia.basescan.org',
    isTestnet: true,
  },
};

export const HEALTH_FACTOR_THRESHOLDS = {
  SAFE: 1.5,
  WARNING: 1.2,
  LIQUIDATION: 1.0,
} as const;

export const DECIMAL_PRECISION = {
  USDC: 6,
  ETH: 18,
  RWA_DEFAULT: 18,
  HEALTH_FACTOR: 4,
  LTV: 4,
  PERCENTAGE: 2,
} as const;

export const GAS_LIMITS = {
  SUPPLY_COLLATERAL_AND_BORROW: 300000,
  REPAY_AND_WITHDRAW: 250000,
  ADD_COLLATERAL: 150000,
  LIQUIDATE: 350000,
  APPROVE: 50000,
} as const;

// Utility Types
export type Address = `0x${string}`;
export type Hash = `0x${string}`;
export type ChainId = keyof typeof SUPPORTED_NETWORKS;

// Error Types
export interface Web3Error {
  code: number;
  message: string;
  data?: any;
}

export interface ContractError extends Error {
  code?: string;
  reason?: string;
  method?: string;
  transaction?: any;
}

// Hook Return Types
export interface UseWalletReturn extends WalletState {
  connect: () => Promise<void>;
  disconnect: () => void;
  switchNetwork: (chainId: string) => Promise<void>;
}

export interface UseContractReturn<T = any> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export interface UseTransactionReturn {
  execute: (params: any) => Promise<string>;
  loading: boolean;
  error: string | null;
  txHash: string | null;
}

// Form Validation Types
export interface ValidationRule {
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
}

export interface FormField {
  name: string;
  value: string;
  rules: ValidationRule[];
  error?: string;
}

// Component Props Types
export interface PositionCardProps {
  position: PositionAnalytics | null;
  loading: boolean;
  selectedRWA: string;
}

export interface TransactionFormProps {
  onSubmit: (params: SupplyCollateralAndBorrowParams) => Promise<void>;
  loading: boolean;
  supportedTokens: RWAToken[];
}

export interface WalletButtonProps {
  account: string;
  isConnected: boolean;
  onConnect: () => Promise<void>;
  onDisconnect: () => void;
  loading: boolean;
}