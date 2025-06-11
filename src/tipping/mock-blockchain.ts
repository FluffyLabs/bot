import type { TipCommand } from './types.js';
import { isValidAssetHubAddress, type BalanceResult } from './blockchain.js';
import { isSupportedAsset } from '../config.js';

export interface TransactionResult {
  success: boolean;
  transactionHash?: string;
  blockHash?: string;
  explorerUrl?: string;
  error?: string;
}

export interface BlockchainService {
  sendTip(tipCommand: TipCommand): Promise<TransactionResult>;
  checkBalance(): Promise<BalanceResult>;
  disconnect(): Promise<void>;
}

export class MockAssetHubService implements BlockchainService {
  async sendTip(tipCommand: TipCommand): Promise<TransactionResult> {
    console.log(`[BLOCKCHAIN] 🧪 Starting mock transaction for ${tipCommand.amount} ${tipCommand.asset}`);
    console.log(`[BLOCKCHAIN] 📋 Mock transaction details:`, {
      recipient: tipCommand.recipientAddress,
      amount: tipCommand.amount,
      asset: tipCommand.asset,
      comment: tipCommand.comment || 'none'
    });

    try {
      // Validate asset type
      console.log(`[BLOCKCHAIN] 🔍 Validating asset: ${tipCommand.asset}`);
      if (!isSupportedAsset(tipCommand.asset)) {
        console.log(`[BLOCKCHAIN] ❌ Unsupported asset: ${tipCommand.asset}`);
        throw new Error(`Unsupported asset: ${tipCommand.asset}`);
      }
      console.log(`[BLOCKCHAIN] ✅ Asset validation passed`);

      // Validate recipient address
      console.log(`[BLOCKCHAIN] 🏠 Validating recipient address: ${tipCommand.recipientAddress}`);
      if (!isValidAssetHubAddress(tipCommand.recipientAddress)) {
        console.log(`[BLOCKCHAIN] ❌ Invalid recipient address: ${tipCommand.recipientAddress}`);
        throw new Error(`Invalid recipient address: ${tipCommand.recipientAddress}`);
      }
      console.log(`[BLOCKCHAIN] ✅ Address validation passed`);

      // Convert amount to blockchain units for logging
      const amount = this.convertToBlockchainAmount(tipCommand.amount, tipCommand.asset);
      console.log(`[BLOCKCHAIN] 🔢 Converted ${tipCommand.amount} ${tipCommand.asset} to ${amount} blockchain units`);

      console.log(`[SIMULATION] Preparing transaction for ${tipCommand.asset}`);

      if (tipCommand.asset === "DOT") {
        console.log(`[SIMULATION] Would send ${amount} planck DOT to ${tipCommand.recipientAddress}`);
      } else if (tipCommand.asset === "USDC") {
        const usdcAssetId = 1337; // Asset ID for USDC on Asset Hub
        console.log(`[SIMULATION] Would send ${amount} USDC units (asset ${usdcAssetId}) to ${tipCommand.recipientAddress}`);
      }

      // Generate deterministic mock transaction hashes for consistent testing
      console.log(`[BLOCKCHAIN] 🎲 Generating mock transaction hashes...`);
      const mockTxHash = "0x" + Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0')).join('');
      const mockBlockHash = "0x" + Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0')).join('');

      console.log(`[SIMULATION] Transaction hash: ${mockTxHash}`);
      console.log(`[BLOCKCHAIN] 🔗 Mock block hash: ${mockBlockHash}`);

      // Simulate network delay for realistic testing
      console.log(`[BLOCKCHAIN] ⏳ Simulating network delay...`);
      await new Promise(resolve => setTimeout(resolve, 100));
      console.log(`[BLOCKCHAIN] ✅ Mock transaction simulation complete`);

      const result = {
        success: true,
        transactionHash: mockTxHash,
        blockHash: mockBlockHash,
        explorerUrl: this.getExplorerUrl(mockTxHash),
      };

      console.log(`[BLOCKCHAIN] 🎉 Mock transaction successful!`, {
        txHash: result.transactionHash,
        blockHash: result.blockHash,
        explorerUrl: result.explorerUrl
      });

      return result;

    } catch (error) {
      const errorMessage = `Blockchain transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.log(`[BLOCKCHAIN] 💥 Mock transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  private convertToBlockchainAmount(amount: number, asset: 'DOT' | 'USDC'): bigint {
    if (asset === "DOT") {
      // DOT has 10 decimal places (1 DOT = 10^10 planck)
      return BigInt(Math.floor(amount * 10_000_000_000));
    } else if (asset === "USDC") {
      // USDC typically has 6 decimal places (1 USDC = 10^6 units)
      return BigInt(Math.floor(amount * 1_000_000));
    } else {
      throw new Error(`Unsupported asset: ${asset}`);
    }
  }

  private getExplorerUrl(transactionHash: string): string {
    return `https://assethub-polkadot.subscan.io/extrinsic/${transactionHash}`;
  }

  async checkBalance(): Promise<BalanceResult> {
    console.log(`[BLOCKCHAIN] 🧪 Starting mock balance check...`);
    
    try {
      // Simulate network delay
      console.log(`[BLOCKCHAIN] ⏳ Simulating balance query delay...`);
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Mock balances - reasonable test amounts
      // 1000 DOT = 1000 * 10^10 planck
      const mockDotBalance = BigInt(1000 * 10_000_000_000);
      // 5000 USDC = 5000 * 10^6 units  
      const mockUsdcBalance = BigInt(5000 * 1_000_000);
      
      console.log(`[BLOCKCHAIN] 💰 Mock DOT balance: ${mockDotBalance} planck (1000 DOT)`);
      console.log(`[BLOCKCHAIN] 💰 Mock USDC balance: ${mockUsdcBalance} units (5000 USDC)`);
      
      const result: BalanceResult = {
        dotBalance: mockDotBalance,
        usdcBalance: mockUsdcBalance,
        success: true,
      };
      
      console.log(`[BLOCKCHAIN] ✅ Mock balance check complete`);
      return result;
      
    } catch (error) {
      const errorMessage = `Mock balance check failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.log(`[BLOCKCHAIN] 💥 Mock balance check failed: ${errorMessage}`);
      return {
        dotBalance: 0n,
        usdcBalance: 0n,
        success: false,
        error: errorMessage,
      };
    }
  }

  async disconnect(): Promise<void> {
    // Mock disconnect - no cleanup needed
  }
}