import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { CONTRACT_ADDRESSES, getUSDCAddress, getMorphoAddress, formatBigInt, truncateAddress } from '@/utils';
import { useWeb3 } from '@/hooks/useWeb3';

// ✅ UPDATED: Use deployed contract addresses
const CONTRACT_ADDRESS = CONTRACT_ADDRESSES.RWA_HUB; // 0xC085e5E50872D597DE3e3195C74ca953e4a3851A
const RWA_ORACLE_ADDRESS = CONTRACT_ADDRESSES.RWA_ORACLE; // 0x0403F1a45e538eebF887afD1f7318fA3255f1273

// Helper functions for big number operations
const toBigInt = (value: string | number, decimals: number = 18): bigint => {
  if (!value || value === '') return 0n;
  const [integer, fraction = ''] = value.toString().split('.');
  const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
  return BigInt(integer + paddedFraction);
};

// Mock RWA tokens for demo (replace with real data from your contract)
const mockRWATokens = [
  { 
    address: '0x742d35Cc6Bf32f9B1C9c85c5e8C8f0d8Ba1F7B95', 
    name: 'Centrifuge CFG', 
    type: 'Real Estate',
    symbol: 'CFG',
    decimals: 18
  },
  { 
    address: '0x853d955aCEf822Db058eb8505911ED77F175b99e', 
    name: 'Maple Finance', 
    type: 'Corporate Credit',
    symbol: 'MPL',
    decimals: 18
  },
  { 
    address: '0x956F47F50A910163D8BF957Cf5846D573E7f87CA', 
    name: 'TrueFi TRU', 
    type: 'Uncollateralized Loans',
    symbol: 'TRU', 
    decimals: 18
  }
];

export default function Home() {
  // Wallet state
  const [account, setAccount] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [chainId, setChainId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // UI state
  const [selectedRWA, setSelectedRWA] = useState<string>('');
  const [collateralAmount, setCollateralAmount] = useState<string>('');
  const [borrowAmount, setBorrowAmount] = useState<string>('');

  // Data state
  const [supportedTokens, setSupportedTokens] = useState<any[]>([]);
  const [positionData, setPositionData] = useState<any>(null);
  
  // ✅ Demo/Live Mode Toggle State
  const [isLiveMode, setIsLiveMode] = useState(false);

  // ✅ NEW: Web3 Integration
  const {
    transactionStatus,
    fetchPositionData: fetchLivePositionData,
    getSupportedTokens,
    getUserTokenBalance,
    executeSupplyAndBorrow,
    resetTransactionStatus
  } = useWeb3();

  // Initialize wallet connection
  useEffect(() => {
    checkConnection();
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
    }
    
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, []);

  // Fetch position data when wallet connects or RWA selection changes
  useEffect(() => {
    if (isConnected && selectedRWA) {
      fetchPositionData();
    }
  }, [isConnected, selectedRWA, account, isLiveMode]);

  // ✅ NEW: Load supported tokens in live mode
  useEffect(() => {
    if (isConnected && isLiveMode) {
      loadSupportedTokens();
    }
  }, [isConnected, isLiveMode]);

  const checkConnection = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          setIsConnected(true);
          setChainId(chainId);
          setSupportedTokens(mockRWATokens); // In production, fetch from contract
        }
      } catch (error) {
        console.error('Error checking connection:', error);
      }
    }
  };

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        setIsLoading(true);
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        
        setAccount(accounts[0]);
        setIsConnected(true);
        setChainId(chainId);
        setSupportedTokens(mockRWATokens);

        // Switch to Sepolia if not already connected
        if (chainId !== '0xaa36a7') {
          await switchToSepolia();
        }
      } catch (error) {
        console.error('Error connecting wallet:', error);
        alert('Failed to connect wallet. Please try again.');
      } finally {
        setIsLoading(false);
      }
    } else {
      alert('Please install MetaMask or another Web3 wallet');
    }
  };

  const switchToSepolia = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xaa36a7' }], // Sepolia testnet
      });
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: '0xaa36a7',
                chainName: 'Sepolia Test Network',
                nativeCurrency: {
                  name: 'SepoliaETH',
                  symbol: 'SEP',
                  decimals: 18,
                },
                rpcUrls: ['https://sepolia.infura.io/v3/'],
                blockExplorerUrls: ['https://sepolia.etherscan.io/'],
              },
            ],
          });
        } catch (addError) {
          console.error('Error adding Sepolia network:', addError);
        }
      }
    }
  };

  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) {
      setAccount('');
      setIsConnected(false);
      setPositionData(null);
    } else {
      setAccount(accounts[0]);
    }
  };

  const handleChainChanged = (chainId: string) => {
    setChainId(chainId);
    window.location.reload(); // Refresh on chain change
  };

  // ✅ NEW: Load supported tokens from blockchain
  const loadSupportedTokens = async () => {
    try {
      const tokens = await getSupportedTokens();
      console.log('Supported tokens from contract:', tokens);
      // For now, use mock tokens but you can expand this
      setSupportedTokens(mockRWATokens);
    } catch (error) {
      console.error('Error loading supported tokens:', error);
      setSupportedTokens(mockRWATokens); // Fallback to mock
    }
  };

  // ✅ UPDATED: Enhanced position data fetching
  const fetchPositionData = async () => {
    if (!selectedRWA || !account) return;
    
    try {
      if (!isLiveMode) {
        // Mock position data for demo
        const mockPosition = {
          collateralAmount: toBigInt('1000', 18),
          collateralValueUSD: toBigInt('50000', 18),
          borrowedAssets: toBigInt('25000', 6),
          borrowedValueUSD: toBigInt('25000', 18),
          healthFactor: toBigInt('2.0', 4),
          currentLTV: toBigInt('0.5', 4),
          liquidationPrice: toBigInt('40000', 18),
          availableToBorrow: toBigInt('15000', 6),
          availableToWithdraw: toBigInt('500', 18)
        };
        setPositionData(mockPosition);
      } else {
        // ✅ NEW: Real contract call
        console.log(`Fetching live position data for ${account} and ${selectedRWA}`);
        const livePositionData = await fetchLivePositionData(account, selectedRWA);
        setPositionData(livePositionData);
      }
    } catch (error) {
      console.error('Error fetching position data:', error);
    }
  };

  // ✅ UPDATED: Enhanced transaction execution
  const executeTransaction = async () => {
    if (!selectedRWA || !collateralAmount || !borrowAmount) {
      alert('Please fill in all fields');
      return;
    }

    if (chainId !== '0xaa36a7') {
      alert('Please switch to Sepolia testnet to use the deployed contracts');
      await switchToSepolia();
      return;
    }

    try {
      setIsLoading(true);
      resetTransactionStatus(); // Clear any previous transaction status
      
      const selectedToken = supportedTokens.find(t => t.address === selectedRWA);
      if (!selectedToken) {
        alert('Invalid RWA token selected');
        return;
      }

      // Convert amounts to proper decimals
      const collateralAmountWei = toBigInt(collateralAmount, selectedToken.decimals);
      const borrowAmountWei = toBigInt(borrowAmount, 6); // USDC has 6 decimals

      if (!isLiveMode) {
        // Demo mode - show transaction details without executing
        alert(`DEMO MODE - Transaction Preview:
          Contract: ${truncateAddress(CONTRACT_ADDRESS)}
          RWA Token: ${selectedToken.name}
          Collateral: ${collateralAmount} ${selectedToken.symbol}
          Borrow: ${borrowAmount} USDC
          
          Switch to Live Mode to execute real transactions`);
      } else {
        // ✅ NEW: Live mode - execute real blockchain transaction
        console.log('Live Mode - Executing real transaction:', {
          contract: CONTRACT_ADDRESS,
          rwaToken: selectedRWA,
          collateral: collateralAmountWei.toString(),
          borrow: borrowAmountWei.toString(),
          account
        });

        const success = await executeSupplyAndBorrow(
          selectedRWA,
          collateralAmountWei,
          borrowAmountWei,
          account
        );

        if (success) {
          alert(`✅ Transaction Successful!
            Collateral: ${collateralAmount} ${selectedToken.symbol}
            Borrowed: ${borrowAmount} USDC
            
            Position data will refresh automatically.`);
        }
      }
      
      // Reset form
      setCollateralAmount('');
      setBorrowAmount('');
      
      // Refresh position data
      setTimeout(fetchPositionData, 2000);
      
    } catch (error) {
      console.error('Transaction error:', error);
      alert('Transaction failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getNetworkName = (chainId: string): string => {
    switch (chainId) {
      case '0x1': return 'Ethereum Mainnet';
      case '0x2105': return 'Base';
      case '0xaa36a7': return 'Sepolia Testnet';
      case '0x14a33': return 'Base Sepolia';
      default: return 'Unknown Network';
    }
  };

  const getNetworkStatus = (chainId: string): { isSupported: boolean; color: string; message: string } => {
    if (chainId === '0xaa36a7') {
      return {
        isSupported: true,
        color: 'text-green-600',
        message: '✅ Connected to Sepolia (Contracts Deployed)'
      };
    }
    return {
      isSupported: false,
      color: 'text-red-600',
      message: '❌ Please switch to Sepolia testnet'
    };
  };

  const getHealthFactorColor = (healthFactor: bigint): string => {
    const hf = Number(formatBigInt(healthFactor, 4, 2));
    if (hf > 1.5) return 'health-factor-good';
    if (hf > 1.2) return 'health-factor-warning';
    return 'health-factor-danger';
  };

  // ✅ NEW: Get transaction status display
  const getTransactionStatusDisplay = () => {
    if (!transactionStatus.isLoading && transactionStatus.stage === 'idle') return null;
    
    const stageMessages = {
      approval: '🔄 Waiting for token approval...',
      transaction: '🔄 Executing transaction...',
      confirming: '⏳ Confirming transaction...',
      success: '✅ Transaction successful!',
      error: `❌ ${transactionStatus.error}`
    };

    return (
      <div className={`mt-4 p-3 rounded-lg text-sm ${
        transactionStatus.stage === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
        transactionStatus.stage === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
        'bg-blue-50 text-blue-800 border border-blue-200'
      }`}>
        <div className="flex items-center justify-between">
          <span>{stageMessages[transactionStatus.stage] || 'Processing...'}</span>
          {transactionStatus.txHash && (
            <a 
              href={`https://sepolia.etherscan.io/tx/${transactionStatus.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline ml-2"
            >
              View on Etherscan
            </a>
          )}
        </div>
      </div>
    );
  };

  if (!isConnected) {
    return (
      <>
        <Head>
          <title>Connect Wallet - Morpho RWA Liquidity Hub</title>
        </Head>
        
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="card max-w-md text-center animate-fade-in">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gradient mb-2">
                Morpho RWA Liquidity Hub
              </h1>
              <p className="text-gray-600 mb-4">
                Connect your wallet to access instant RWA liquidity
              </p>
              
              {/* Deployment Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                <h3 className="font-semibold text-blue-800 mb-2">🚀 Live on Sepolia</h3>
                <div className="text-sm text-blue-700 space-y-1">
                  <div>RWA Hub: <code className="text-xs">{truncateAddress(CONTRACT_ADDRESS)}</code></div>
                  <div>Oracle: <code className="text-xs">{truncateAddress(RWA_ORACLE_ADDRESS)}</code></div>
                  <div>Network: Sepolia Testnet</div>
                </div>
              </div>
            </div>
            
            <button
              onClick={connectWallet}
              disabled={isLoading}
              className="wallet-button w-full"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <div className="spinner mr-2"></div>
                  Connecting...
                </span>
              ) : (
                'Connect Wallet'
              )}
            </button>
            
            {!window.ethereum && (
              <p className="text-sm text-danger-red mt-4">
                Please install MetaMask or another Web3 wallet
              </p>
            )}
          </div>
        </div>
      </>
    );
  }

  const networkStatus = getNetworkStatus(chainId);

  return (
    <>
      <Head>
        <title>Dashboard - Morpho RWA Liquidity Hub</title>
      </Head>
      
      <div className="min-h-screen p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <header className="mb-8 animate-slide-in">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
              <div>
                <h1 className="text-4xl font-bold text-gradient mb-2">
                  RWA Liquidity Hub
                </h1>
                <p className="text-gray-600">
                  Borrow USDC against your Real World Assets using Morpho Blue
                </p>
              </div>
              
              {/* Demo/Live Mode Toggle */}
              <div className="flex items-center space-x-3 bg-gray-800/50 rounded-lg px-4 py-2 border border-gray-700 mt-4 lg:mt-0">
                <span className={`text-sm font-medium ${!isLiveMode ? 'text-blue-400' : 'text-gray-400'}`}>
                  Demo
                </span>
                <button
                  onClick={() => setIsLiveMode(!isLiveMode)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isLiveMode ? 'bg-green-600' : 'bg-gray-600'
                  }`}
                >
                  <span className="sr-only">Toggle demo/live mode</span>
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isLiveMode ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className={`text-sm font-medium ${isLiveMode ? 'text-green-400' : 'text-gray-400'}`}>
                  Live
                </span>
                {isLiveMode && (
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-xs text-green-300">Blockchain</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card p-4">
                <div className="text-sm text-gray-500">Connected Account</div>
                <div className="font-mono text-sm font-semibold">
                  {truncateAddress(account)}
                </div>
              </div>
              
              <div className="card p-4">
                <div className="text-sm text-gray-500">Network</div>
                <div className={`text-sm font-semibold ${networkStatus.color}`}>
                  {getNetworkName(chainId)}
                </div>
              </div>

              <div className="card p-4">
                <div className="text-sm text-gray-500">Mode Status</div>
                <div className={`text-xs ${isLiveMode ? 'text-green-600' : 'text-blue-600'}`}>
                  {isLiveMode ? '🟢 Live Blockchain Mode' : '🔵 Demo Mode Active'}
                </div>
              </div>
            </div>

            {/* Contract Info */}
            <div className="mt-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-2">📋 Deployed Contracts</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-blue-600">RWA Liquidity Hub:</span>
                  <br />
                  <code className="text-xs text-gray-700">{CONTRACT_ADDRESS}</code>
                </div>
                <div>
                  <span className="text-blue-600">RWA Oracle:</span>
                  <br />
                  <code className="text-xs text-gray-700">{RWA_ORACLE_ADDRESS}</code>
                </div>
              </div>
            </div>
          </header>

          {!networkStatus.isSupported && (
            <div className="mb-8 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="text-red-600 mr-3">⚠️</div>
                <div>
                  <div className="font-semibold text-red-800">Wrong Network</div>
                  <div className="text-red-700 text-sm">
                    Please switch to Sepolia testnet to interact with the deployed contracts.
                  </div>
                  <button 
                    onClick={switchToSepolia}
                    className="mt-2 bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700"
                  >
                    Switch to Sepolia
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Position Overview */}
            <div className="card animate-fade-in">
              <h2 className="text-2xl font-semibold mb-6">Your Position</h2>
              
              {positionData && selectedRWA ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="stat-card">
                      <div className="text-sm text-gray-600 mb-1">Collateral Value</div>
                      <div className="text-xl font-bold">
                        ${formatBigInt(positionData.collateralValueUSD, 18, 2)}
                      </div>
                    </div>
                    
                    <div className="stat-card">
                      <div className="text-sm text-gray-600 mb-1">Borrowed</div>
                      <div className="text-xl font-bold">
                        ${formatBigInt(positionData.borrowedValueUSD, 18, 2)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="stat-card">
                      <div className="text-sm text-gray-600 mb-1">Health Factor</div>
                      <div className={`text-xl font-bold ${getHealthFactorColor(positionData.healthFactor)}`}>
                        {formatBigInt(positionData.healthFactor, 4, 2)}
                      </div>
                    </div>
                    
                    <div className="stat-card">
                      <div className="text-sm text-gray-600 mb-1">Available to Borrow</div>
                      <div className="text-xl font-bold text-rwa-green">
                        ${formatBigInt(positionData.availableToBorrow, 6, 2)}
                      </div>
                    </div>
                  </div>

                  {/* LTV Progress Bar */}
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="text-sm font-medium text-blue-700 mb-2">Current LTV</div>
                    <div className="w-full bg-blue-200 rounded-full h-4">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-4 rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(Number(formatBigInt(positionData.currentLTV, 4, 4)) * 100, 100)}%`
                        }}
                      ></div>
                    </div>
                    <div className="text-sm text-blue-600 mt-2">
                      {(Number(formatBigInt(positionData.currentLTV, 4, 4)) * 100).toFixed(1)}% of max 80%
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <p>Select an RWA token to view your position</p>
                </div>
              )}
            </div>

            {/* Supply & Borrow Interface */}
            <div className="card animate-fade-in">
              <h2 className="text-2xl font-semibold mb-6">Get Instant Liquidity</h2>
              
              <div className="space-y-6">
                {/* RWA Token Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select RWA Token
                  </label>
                  <select
                    value={selectedRWA}
                    onChange={(e) => setSelectedRWA(e.target.value)}
                    className="input-field"
                    disabled={!networkStatus.isSupported}
                  >
                    <option value="">Choose RWA Token...</option>
                    {supportedTokens.map((token, index) => (
                      <option key={index} value={token.address}>
                        {token.name} ({token.type})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Collateral Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Collateral Amount
                  </label>
                  <input
                    type="number"
                    value={collateralAmount}
                    onChange={(e) => setCollateralAmount(e.target.value)}
                    placeholder="Enter RWA token amount"
                    className="input-field"
                    disabled={!networkStatus.isSupported}
                  />
                </div>

                {/* Borrow Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Borrow Amount (USDC)
                  </label>
                  <input
                    type="number"
                    value={borrowAmount}
                    onChange={(e) => setBorrowAmount(e.target.value)}
                    placeholder="Enter USDC amount to borrow"
                    className="input-field"
                    disabled={!networkStatus.isSupported}
                  />
                </div>

                {/* Transaction Summary */}
                {collateralAmount && borrowAmount && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                    <div className="text-sm font-medium text-blue-800 mb-3">Transaction Summary</div>
                    <div className="text-sm text-blue-700 space-y-2">
                      <div className="flex justify-between">
                        <span>Collateral:</span>
                        <span className="font-semibold">{collateralAmount} RWA tokens</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Borrow:</span>
                        <span className="font-semibold">{borrowAmount} USDC</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Platform Fee (0.5%):</span>
                        <span>{(Number(borrowAmount) * 0.005).toFixed(2)} USDC</span>
                      </div>
                      <div className="border-t pt-2 text-xs">
                        <div>Mode: <span className={isLiveMode ? 'text-green-600' : 'text-blue-600'}>{isLiveMode ? 'Live Blockchain' : 'Demo'}</span></div>
                        <div>Contract: <code>{truncateAddress(CONTRACT_ADDRESS)}</code></div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ✅ NEW: Transaction Status Display */}
                {getTransactionStatusDisplay()}

                {/* Submit Button */}
                <button
                  onClick={executeTransaction}
                  disabled={
                    isLoading || 
                    transactionStatus.isLoading || 
                    !networkStatus.isSupported || 
                    !selectedRWA || 
                    !collateralAmount || 
                    !borrowAmount
                  }
                  className="btn-primary w-full"
                >
                  {isLoading || transactionStatus.isLoading ? (
                    <span className="flex items-center justify-center">
                      <div className="spinner mr-2"></div>
                      {transactionStatus.stage === 'approval' ? 'Approving Token...' :
                       transactionStatus.stage === 'transaction' ? 'Executing...' :
                       transactionStatus.stage === 'confirming' ? 'Confirming...' :
                       'Processing...'}
                    </span>
                  ) : !networkStatus.isSupported ? (
                    'Switch to Sepolia First'
                  ) : isLiveMode ? (
                    'Execute Live Transaction'
                  ) : (
                    'Preview Transaction (Demo)'
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Safety Notice */}
          <div className="mt-8 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-6 animate-fade-in">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-warning-yellow" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-semibold text-yellow-800">Important Information</h3>
                <div className="mt-3 text-sm text-yellow-700">
                  <ul className="list-disc pl-5 space-y-2">
                    <li>✅ <strong>Contracts are deployed and live on Sepolia testnet</strong></li>
                    <li>🔵 <strong>Demo Mode:</strong> Safe preview with mock data for presentations</li>
                    <li>🟢 <strong>Live Mode:</strong> Real blockchain transactions with gas fees</li>
                    <li>Monitor your health factor to avoid liquidation (keep above 1.5)</li>
                    <li>RWA prices may be less liquid than traditional crypto assets</li>
                    <li>Always test with small amounts first on testnets</li>
                    <li>Ensure KYC verification is complete before large transactions</li>
                    <li><strong>Live Mode Features:</strong> Token approvals, gas estimation, transaction tracking</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}