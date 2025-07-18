// hooks/useWeb3.ts
import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { 
  getMorphoContract, 
  getTokenContract, 
  checkTokenAllowance, 
  approveToken,
  getTokenBalance,
  formatTransactionError,
  estimateGas,
  waitForTransaction 
} from '@/utils/web3';
import { CONTRACT_ADDRESSES, formatBigInt } from '@/utils';

export interface PositionData {
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

export interface TransactionStatus {
  isLoading: boolean;
  error: string | null;
  txHash: string | null;
  stage: 'idle' | 'approval' | 'transaction' | 'confirming' | 'success' | 'error';
}

export const useWeb3 = () => {
  const [transactionStatus, setTransactionStatus] = useState<TransactionStatus>({
    isLoading: false,
    error: null,
    txHash: null,
    stage: 'idle'
  });

  // Reset transaction status
  const resetTransactionStatus = useCallback(() => {
    setTransactionStatus({
      isLoading: false,
      error: null,
      txHash: null,
      stage: 'idle'
    });
  }, []);

  // Fetch real position data from blockchain
  const fetchPositionData = useCallback(async (
    userAddress: string, 
    rwaTokenAddress: string
  ): Promise<PositionData | null> => {
    try {
      const contract = await getMorphoContract();
      if (!contract) {
        throw new Error('Could not connect to contract');
      }

      console.log('Fetching position data for:', { userAddress, rwaTokenAddress });

      const positionData = await contract.getPositionAnalytics(userAddress, rwaTokenAddress);
      
      return {
        collateralAmount: BigInt(positionData.collateralAmount.toString()),
        collateralValueUSD: BigInt(positionData.collateralValueUSD.toString()),
        borrowedAssets: BigInt(positionData.borrowedAssets.toString()),
        borrowedValueUSD: BigInt(positionData.borrowedValueUSD.toString()),
        healthFactor: BigInt(positionData.healthFactor.toString()),
        currentLTV: BigInt(positionData.currentLTV.toString()),
        liquidationPrice: BigInt(positionData.liquidationPrice.toString()),
        availableToBorrow: BigInt(positionData.availableToBorrow.toString()),
        availableToWithdraw: BigInt(positionData.availableToWithdraw.toString())
      };
    } catch (error) {
      console.error('Error fetching position data:', error);
      return null;
    }
  }, []);

  // Get supported RWA tokens from contract
  const getSupportedTokens = useCallback(async (): Promise<string[]> => {
    try {
      const contract = await getMorphoContract();
      if (!contract) {
        throw new Error('Could not connect to contract');
      }

      const tokens = await contract.getSupportedRWATokens();
      return tokens;
    } catch (error) {
      console.error('Error fetching supported tokens:', error);
      return [];
    }
  }, []);

  // Check if token approval is needed
  const checkApprovalNeeded = useCallback(async (
    tokenAddress: string,
    userAddress: string,
    amount: bigint
  ): Promise<boolean> => {
    try {
      const allowance = await checkTokenAllowance(
        tokenAddress,
        userAddress,
        CONTRACT_ADDRESSES.RWA_HUB
      );
      
      return allowance < amount;
    } catch (error) {
      console.error('Error checking approval:', error);
      return true; // Assume approval needed on error
    }
  }, []);

  // Get user's token balance
  const getUserTokenBalance = useCallback(async (
    tokenAddress: string,
    userAddress: string
  ): Promise<bigint> => {
    try {
      return await getTokenBalance(tokenAddress, userAddress);
    } catch (error) {
      console.error('Error getting token balance:', error);
      return 0n;
    }
  }, []);

  // Execute supply collateral and borrow transaction
  const executeSupplyAndBorrow = useCallback(async (
    rwaTokenAddress: string,
    collateralAmount: bigint,
    borrowAmount: bigint,
    userAddress: string
  ): Promise<boolean> => {
    try {
      setTransactionStatus({
        isLoading: true,
        error: null,
        txHash: null,
        stage: 'approval'
      });

      // Step 1: Check if approval is needed
      const approvalNeeded = await checkApprovalNeeded(
        rwaTokenAddress,
        userAddress,
        collateralAmount
      );

      if (approvalNeeded) {
        console.log('Token approval required...');
        
        // Execute approval transaction
        const approveTx = await approveToken(
          rwaTokenAddress,
          CONTRACT_ADDRESSES.RWA_HUB,
          collateralAmount
        );

        if (!approveTx) {
          throw new Error('Approval transaction failed');
        }

        setTransactionStatus(prev => ({
          ...prev,
          txHash: approveTx.hash,
          stage: 'confirming'
        }));

        // Wait for approval confirmation
        console.log('Waiting for approval confirmation...');
        await waitForTransaction(approveTx.hash, 1);
        console.log('Approval confirmed!');
      }

      // Step 2: Execute main transaction
      setTransactionStatus(prev => ({
        ...prev,
        stage: 'transaction',
        txHash: null
      }));

      const contract = await getMorphoContract();
      if (!contract) {
        throw new Error('Could not connect to contract');
      }

      console.log('Executing supply and borrow transaction...');
      
      // Estimate gas
      const gasLimit = await estimateGas(
        contract,
        'supplyCollateralAndBorrow',
        [rwaTokenAddress, collateralAmount.toString(), borrowAmount.toString()]
      );

      // Execute transaction
      const tx = await contract.supplyCollateralAndBorrow(
        rwaTokenAddress,
        collateralAmount.toString(),
        borrowAmount.toString(),
        {
          gasLimit: gasLimit.toString()
        }
      );

      setTransactionStatus(prev => ({
        ...prev,
        txHash: tx.hash,
        stage: 'confirming'
      }));

      console.log('Transaction submitted:', tx.hash);

      // Wait for confirmation
      const receipt = await waitForTransaction(tx.hash, 1);
      
      if (receipt && receipt.status === 1) {
        console.log('Transaction confirmed!');
        setTransactionStatus(prev => ({
          ...prev,
          stage: 'success',
          isLoading: false
        }));
        return true;
      } else {
        throw new Error('Transaction failed');
      }

    } catch (error: any) {
      console.error('Transaction error:', error);
      const errorMessage = formatTransactionError(error);
      
      setTransactionStatus({
        isLoading: false,
        error: errorMessage,
        txHash: null,
        stage: 'error'
      });
      
      return false;
    }
  }, [checkApprovalNeeded]);

  // Execute repay and withdraw transaction
  const executeRepayAndWithdraw = useCallback(async (
    rwaTokenAddress: string,
    repayAmount: bigint,
    withdrawAmount: bigint,
    fullRepayment: boolean = false
  ): Promise<boolean> => {
    try {
      setTransactionStatus({
        isLoading: true,
        error: null,
        txHash: null,
        stage: 'transaction'
      });

      const contract = await getMorphoContract();
      if (!contract) {
        throw new Error('Could not connect to contract');
      }

      console.log('Executing repay and withdraw transaction...');
      
      // Estimate gas
      const gasLimit = await estimateGas(
        contract,
        'repayAndWithdraw',
        [rwaTokenAddress, repayAmount.toString(), withdrawAmount.toString(), fullRepayment]
      );

      // Execute transaction
      const tx = await contract.repayAndWithdraw(
        rwaTokenAddress,
        repayAmount.toString(),
        withdrawAmount.toString(),
        fullRepayment,
        {
          gasLimit: gasLimit.toString()
        }
      );

      setTransactionStatus(prev => ({
        ...prev,
        txHash: tx.hash,
        stage: 'confirming'
      }));

      console.log('Transaction submitted:', tx.hash);

      // Wait for confirmation
      const receipt = await waitForTransaction(tx.hash, 1);
      
      if (receipt && receipt.status === 1) {
        console.log('Transaction confirmed!');
        setTransactionStatus(prev => ({
          ...prev,
          stage: 'success',
          isLoading: false
        }));
        return true;
      } else {
        throw new Error('Transaction failed');
      }

    } catch (error: any) {
      console.error('Transaction error:', error);
      const errorMessage = formatTransactionError(error);
      
      setTransactionStatus({
        isLoading: false,
        error: errorMessage,
        txHash: null,
        stage: 'error'
      });
      
      return false;
    }
  }, []);

  return {
    // State
    transactionStatus,
    
    // Actions
    fetchPositionData,
    getSupportedTokens,
    getUserTokenBalance,
    executeSupplyAndBorrow,
    executeRepayAndWithdraw,
    resetTransactionStatus,
    
    // Utilities
    checkApprovalNeeded
  };
};