/**
 * Blockchain Transaction Service for Asset Hub
 *
 * This implementation supports both real blockchain connections and mock mode for testing.
 * Real implementation uses polkadot-api for Asset Hub transactions.
 * Supports DOT and USDC transfers with proper transaction signing and monitoring.
 */

import type { TipCommand } from "./types.js";
import { MockAssetHubService } from "./mock-blockchain.js";
import { sr25519PairFromSeed, mnemonicToMiniSecret } from '@polkadot/util-crypto';
import { hexToU8a, u8aToHex } from '@polkadot/util';
import { getPolkadotSigner, type PolkadotSigner } from "@polkadot-api/signer";
import type { PolkadotClient, TypedApi, TxEvent } from "polkadot-api";
import { asset_hub, MultiAddress } from "@polkadot-api/descriptors";

interface Transaction {
  signSubmitAndWatch(signer: PolkadotSigner): {
    subscribe(observer: {
      next: (event: TxEvent) => void;
      error: (error: Error) => void;
      complete: () => void;
    }): void;
  };
}

export interface TransactionResult {
  success: boolean;
  transactionHash?: string;
  blockHash?: string;
  error?: string;
  explorerUrl?: string;
}

export interface BlockchainService {
  sendTip(tipCommand: TipCommand): Promise<TransactionResult>;
  checkBalance(): Promise<BalanceResult>;
  disconnect(): Promise<void>;
}

export interface BalanceResult {
  dotBalance: bigint;
  usdcBalance: bigint;
  success: boolean;
  error?: string;
}

export interface BalanceWarning {
  asset: 'DOT' | 'USDC';
  currentBalance: number;
  threshold: number;
  maxTipAmount: number;
}

// Check if we're in test mode
function isTestMode(): boolean {
  return process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
}

// Helper function to convert blockchain amounts to human readable amounts
function convertFromBlockchainAmount(amount: bigint, asset: 'DOT' | 'USDC'): number {
  if (asset === "DOT") {
    // DOT has 10 decimal places (1 DOT = 10^10 planck)
    return Number(amount) / 10_000_000_000;
  } else if (asset === "USDC") {
    // USDC typically has 6 decimal places (1 USDC = 10^6 units)
    return Number(amount) / 1_000_000;
  } else {
    throw new Error(`Unsupported asset: ${asset}`);
  }
}

class AssetHubService implements BlockchainService {
  private client: PolkadotClient | null = null;
  private api: TypedApi<typeof asset_hub> | null = null;
  private connected = false;
  private provider: any = null;
  private walletSeed: string;
  private assetHubRpc: string;

  constructor(walletSeed: string, assetHubRpc: string) {
    this.walletSeed = walletSeed;
    this.assetHubRpc = assetHubRpc;
  }

  private async ensureConnection(): Promise<void> {
    if (!this.connected) {
      console.log(`[BLOCKCHAIN] 🔌 Establishing connection to Asset Hub...`);
      console.log(`[BLOCKCHAIN] 🌐 RPC endpoint: ${this.assetHubRpc}`);

      try {
        // Dynamic imports for polkadot-api modules
        console.log(`[BLOCKCHAIN] 📦 Loading polkadot-api modules...`);
        const { createClient } = await import("polkadot-api");
        const { getWsProvider } = await import("polkadot-api/ws-provider/node");
        console.log(`[BLOCKCHAIN] ✅ Polkadot-api modules loaded`);

        // Create WebSocket provider
        console.log(`[BLOCKCHAIN] 🔗 Creating WebSocket provider...`);
        this.provider = getWsProvider(this.assetHubRpc);
        console.log(`[BLOCKCHAIN] ✅ WebSocket provider created`);

        // Create client
        console.log(`[BLOCKCHAIN] 🏗️ Creating polkadot-api client...`);
        this.client = createClient(this.provider);
        console.log(`[BLOCKCHAIN] ✅ Client created`);

        // Get typed API for Asset Hub
        console.log(`[BLOCKCHAIN] 🔧 Getting typed API for Asset Hub...`);
        this.api = this.client.getTypedApi(asset_hub);
        console.log(`[BLOCKCHAIN] ✅ Typed API initialized`);

        this.connected = true;
        console.log(`[BLOCKCHAIN] 🎉 Successfully connected to Asset Hub at ${this.assetHubRpc}`);
      } catch (error) {
        const errorMessage = `Failed to connect to Asset Hub: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.log(`[BLOCKCHAIN] 💥 Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        throw new Error(errorMessage);
      }
    } else {
      console.log(`[BLOCKCHAIN] ✅ Already connected to Asset Hub`);
    }
  }

  private createSigner(seed: string): PolkadotSigner {
    try {
      console.log(`[BLOCKCHAIN] 🔑 Creating Sr25519 signer from seed...`);

      let seedBytes: Uint8Array;

      if (seed.startsWith("0x")) {
        // Hex seed - remove 0x prefix and convert to bytes
        const hexString = seed.slice(2);
        if (hexString.length !== 64) {
          throw new Error("Hex seed must be 32 bytes (64 hex characters)");
        }
        seedBytes = hexToU8a(seed);
        console.log(`[BLOCKCHAIN] 🔧 Using hex seed`);
      } else {
        // Mnemonic - convert to mini secret using proper BIP39 derivation
        console.log(`[BLOCKCHAIN] 🔧 Converting mnemonic to seed...`);
        seedBytes = mnemonicToMiniSecret(seed);
      }

      if (seedBytes.length !== 32) {
        throw new Error("Seed must be 32 bytes long");
      }

      // Generate Sr25519 keypair from seed
      console.log(`[BLOCKCHAIN] 🔐 Generating Sr25519 keypair...`);
      const keyPair = sr25519PairFromSeed(seedBytes);
      const publicKey = keyPair.publicKey;
      const secretKey = keyPair.secretKey;

      console.log(`[BLOCKCHAIN] ✅ Sr25519 keypair generated`);
      console.log(`[BLOCKCHAIN] 🔑 Public key: ${u8aToHex(publicKey)}`);

      // Create PolkadotSigner using the helper function
      const signer = getPolkadotSigner(
        publicKey,
        "Sr25519",
        async (signingPayload: Uint8Array) => {
          console.log(`[BLOCKCHAIN] ✍️ Signing transaction...`);
          const { ed25519Sign } = await import('@polkadot/util-crypto');
          const signature = ed25519Sign(signingPayload, { publicKey, secretKey });
          console.log(`[BLOCKCHAIN] ✅ Transaction signed`);
          return signature;
        }
      );

      return signer;
    } catch (error) {
      throw new Error(`Failed to create signer from seed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private getExplorerUrl(transactionHash: string): string {
    return `https://assethub-polkadot.subscan.io/extrinsic/${transactionHash}`;
  }

  private async submitAndMonitorTransaction(transaction: Transaction, signer: PolkadotSigner): Promise<TransactionResult> {
    return new Promise((resolve) => {
      console.log(`[BLOCKCHAIN] 👀 Starting transaction submission...`);

      // Submit the signed transaction and monitor status
      transaction.signSubmitAndWatch(signer)
        .subscribe({
          next: (event: TxEvent) => {
            console.log(`[BLOCKCHAIN] 📡 Transaction event:`, event.type);

            if (event.type === "txBestBlocksState") {
              console.log(`[BLOCKCHAIN] 🏆 Transaction in best block. Hash: ${event.txHash}`);
            } else if (event.type === "finalized") {
              console.log(`[BLOCKCHAIN] 🎯 Transaction finalized in block: ${event.block.hash}`);

              const finalResult = {
                success: true,
                transactionHash: event.txHash,
                blockHash: event.block.hash,
                explorerUrl: this.getExplorerUrl(event.txHash),
              };
              console.log(`[BLOCKCHAIN] 📊 Final transaction result:`, {
                txHash: finalResult.transactionHash,
                blockHash: finalResult.blockHash,
                explorerUrl: finalResult.explorerUrl
              });

              resolve(finalResult);
            }
          },
          error: (error: Error) => {
            console.error('[BLOCKCHAIN] 💥 Transaction error:', error);
            resolve({
              success: false,
              error: `Transaction failed: ${error.message}`,
            });
          },
          complete: () => {
            console.log('[BLOCKCHAIN] ✅ Transaction monitoring complete');
          }
        });
    });
  }

  async sendTip(tipCommand: TipCommand): Promise<TransactionResult> {
    console.log(`[BLOCKCHAIN] 🚀 Starting real blockchain transaction for ${tipCommand.amount} ${tipCommand.asset}`);
    console.log(`[BLOCKCHAIN] 📋 Transaction details:`, {
      recipient: tipCommand.recipientAddress,
      amount: tipCommand.amount,
      asset: tipCommand.asset,
      comment: tipCommand.comment || 'none'
    });

    try {
      console.log(`[BLOCKCHAIN] 🔌 Ensuring blockchain connection...`);
      await this.ensureConnection();

      console.log(`[BLOCKCHAIN] 🔐 Creating transaction signer...`);
      const signer = this.createSigner(this.walletSeed);
      console.log(`[BLOCKCHAIN] ✅ Signer created successfully`);

      // Convert amount to the smallest unit
      console.log(`[BLOCKCHAIN] 🔢 Converting ${tipCommand.amount} ${tipCommand.asset} to blockchain units...`);
      const amount = this.convertToBlockchainAmount(tipCommand.amount, tipCommand.asset);
      console.log(`[BLOCKCHAIN] ✅ Converted to ${amount} blockchain units`);

      // Validate recipient address
      console.log(`[BLOCKCHAIN] 🏠 Validating recipient address: ${tipCommand.recipientAddress}`);
      if (!isValidAssetHubAddress(tipCommand.recipientAddress)) {
        console.log(`[BLOCKCHAIN] ❌ Invalid recipient address: ${tipCommand.recipientAddress}`);
        throw new Error(`Invalid recipient address: ${tipCommand.recipientAddress}`);
      }
      console.log(`[BLOCKCHAIN] ✅ Address validation passed`);

      console.log(`[BLOCKCHAIN] 📡 Creating and signing transaction...`);
      console.log(`Sending ${tipCommand.amount} ${tipCommand.asset} to ${tipCommand.recipientAddress}`);

      if (tipCommand.asset === "DOT") {
        console.log(`[BLOCKCHAIN] 💎 Creating DOT transfer transaction using Balances pallet...`);

        if (!this.api) {
          throw new Error("API not initialized");
        }

        // Create DOT transfer transaction using Balances pallet
        const transaction = this.api.tx.Balances.transfer_keep_alive({
          dest: MultiAddress.Id(tipCommand.recipientAddress),
          value: amount,
        });
        console.log(`[BLOCKCHAIN] ✅ DOT transaction created`);

        return this.submitAndMonitorTransaction(transaction, signer);

      } else if (tipCommand.asset === "USDC") {
        // USDC Asset ID on Asset Hub Polkadot (this may need to be updated)
        const usdcAssetId = 1337;
        console.log(`[BLOCKCHAIN] 🪙 Creating USDC transfer transaction using Assets pallet (asset ID: ${usdcAssetId})...`);

        if (!this.api) {
          throw new Error("API not initialized");
        }

        // Create USDC transfer transaction using Assets pallet
        const transaction = this.api.tx.Assets.transfer_keep_alive({
          id: usdcAssetId,
          target: MultiAddress.Id(tipCommand.recipientAddress),
          amount: amount,
        });
        console.log(`[BLOCKCHAIN] ✅ USDC transaction created`);

        return this.submitAndMonitorTransaction(transaction, signer);

      } else {
        console.log(`[BLOCKCHAIN] ❌ Unsupported asset: ${tipCommand.asset}`);
        throw new Error(`Unsupported asset: ${tipCommand.asset}`);
      }

    } catch (error) {
      const errorMessage = `Blockchain transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error('[BLOCKCHAIN] 💥 Blockchain transaction error:', error);
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

  async checkBalance(): Promise<BalanceResult> {
    console.log(`[BLOCKCHAIN] 💰 Checking wallet balance...`);
    
    try {
      await this.ensureConnection();
      
      if (!this.api) {
        throw new Error("API not initialized");
      }

      console.log(`[BLOCKCHAIN] 🔐 Creating signer for balance check...`);
      const signer = this.createSigner(this.walletSeed);
      const publicKey = signer.publicKey;
      
      // Convert public key to address format
      console.log(`[BLOCKCHAIN] 🏠 Getting wallet address from public key...`);
      const { encodeAddress } = await import('@polkadot/util-crypto');
      const walletAddress = encodeAddress(publicKey, 0); // Polkadot prefix
      console.log(`[BLOCKCHAIN] 📍 Wallet address: ${walletAddress}`);

      // Query DOT balance
      console.log(`[BLOCKCHAIN] 💎 Querying DOT balance...`);
      const dotBalanceQuery = await this.api.query.System.Account.getValue(walletAddress);
      const dotBalance = dotBalanceQuery.data.free;
      console.log(`[BLOCKCHAIN] 💰 DOT balance: ${dotBalance} planck (${convertFromBlockchainAmount(dotBalance, 'DOT')} DOT)`);

      // Query USDC balance (Asset ID 1337)
      console.log(`[BLOCKCHAIN] 🪙 Querying USDC balance...`);
      const usdcAssetId = 1337;
      let usdcBalance = 0n;
      try {
        const usdcBalanceQuery = await this.api.query.Assets.Account.getValue(usdcAssetId, walletAddress);
        if (usdcBalanceQuery) {
          usdcBalance = usdcBalanceQuery.balance;
        }
        console.log(`[BLOCKCHAIN] 💰 USDC balance: ${usdcBalance} units (${convertFromBlockchainAmount(usdcBalance, 'USDC')} USDC)`);
      } catch (error) {
        console.log(`[BLOCKCHAIN] ⚠️ Could not query USDC balance (asset may not exist): ${error instanceof Error ? error.message : 'Unknown error'}`);
        // Keep usdcBalance as 0n
      }

      const result: BalanceResult = {
        dotBalance,
        usdcBalance,
        success: true,
      };

      console.log(`[BLOCKCHAIN] ✅ Balance check complete`);
      return result;

    } catch (error) {
      const errorMessage = `Failed to check wallet balance: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(`[BLOCKCHAIN] 💥 Balance check failed: ${errorMessage}`);
      return {
        dotBalance: 0n,
        usdcBalance: 0n,
        success: false,
        error: errorMessage,
      };
    }
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      try {
        if (this.client) {
          this.client.destroy();
        }
        if (this.provider && typeof this.provider.disconnect === 'function') {
          await this.provider.disconnect();
        }
        this.client = null;
        this.api = null;
        this.provider = null;
        this.connected = false;
        console.log('[BLOCKCHAIN] 🔌 Disconnected from Asset Hub');
      } catch (error) {
        console.error('[BLOCKCHAIN] 💥 Error disconnecting from Asset Hub:', error);
      }
    }
  }
}

// Singleton instance
let blockchainService: BlockchainService | null = null;

export function getBlockchainService(walletSeed?: string, assetHubRpc?: string): BlockchainService {
  if (!blockchainService) {
    if (isTestMode()) {
      console.log(`[BLOCKCHAIN] 🧪 Initializing mock blockchain service for testing`);
      blockchainService = new MockAssetHubService();
      console.log(`[BLOCKCHAIN] ✅ Mock blockchain service initialized`);
    } else {
      console.log(`[BLOCKCHAIN] 🏭 Initializing production blockchain service`);
      if (!walletSeed || !assetHubRpc) {
        console.log(`[BLOCKCHAIN] ❌ Missing required parameters for production service`);
        throw new Error('walletSeed and assetHubRpc are required for production blockchain service');
      }
      console.log(`[BLOCKCHAIN] 🔧 Creating AssetHubService with RPC: ${assetHubRpc}`);
      blockchainService = new AssetHubService(walletSeed, assetHubRpc);
      console.log(`[BLOCKCHAIN] ✅ Production blockchain service initialized`);
    }
  } else {
    console.log(`[BLOCKCHAIN] ♻️ Reusing existing blockchain service instance`);
  }
  return blockchainService;
}

export async function disconnectBlockchain(): Promise<void> {
  if (blockchainService) {
    console.log(`[BLOCKCHAIN] 🔌 Disconnecting blockchain service...`);
    await blockchainService.disconnect();
    blockchainService = null;
    console.log(`[BLOCKCHAIN] ✅ Blockchain service disconnected and reset`);
  } else {
    console.log(`[BLOCKCHAIN] ℹ️ No blockchain service to disconnect`);
  }
}

/**
 * Check if wallet balance is below warning threshold (10x max tip amount)
 */
export function checkBalanceWarnings(
  balanceResult: BalanceResult,
  maxDotTip: number,
  maxUsdcTip: number,
): BalanceWarning[] {
  const warnings: BalanceWarning[] = [];

  if (!balanceResult.success) {
    return warnings;
  }

  // Check DOT balance
  const dotBalance = convertFromBlockchainAmount(balanceResult.dotBalance, 'DOT');
  const dotThreshold = maxDotTip * 10;
  if (dotBalance < dotThreshold) {
    warnings.push({
      asset: 'DOT',
      currentBalance: dotBalance,
      threshold: dotThreshold,
      maxTipAmount: maxDotTip,
    });
  }

  // Check USDC balance
  const usdcBalance = convertFromBlockchainAmount(balanceResult.usdcBalance, 'USDC');
  const usdcThreshold = maxUsdcTip * 10;
  if (usdcBalance < usdcThreshold) {
    warnings.push({
      asset: 'USDC',
      currentBalance: usdcBalance,
      threshold: usdcThreshold,
      maxTipAmount: maxUsdcTip,
    });
  }

  return warnings;
}

/**
 * Validate Asset Hub address format
 * Asset Hub uses the same SS58 format as Polkadot (prefix 0)
 */
export function isValidAssetHubAddress(address: string): boolean {
  // Basic validation for Polkadot SS58 address format
  // More sophisticated validation could decode the address and check the prefix
  const ss58Regex = /^[1-9A-HJ-NP-Za-km-z]{47,48}$/;
  return ss58Regex.test(address);
}

/**
 * Estimate transaction fees for a tip command
 */
export async function estimateTransactionFee(tipCommand: TipCommand): Promise<bigint> {
  try {
    // For now, return fallback estimates since fee estimation requires more complex setup
    if (tipCommand.asset === "DOT") {
      return BigInt(1_000_000_000); // ~0.1 DOT
    } else {
      return BigInt(100_000); // Rough USDC fee estimate
    }

  } catch (error) {
    console.warn('Failed to get fee estimation, returning fallback estimate:', error);

    // Fallback estimates
    if (tipCommand.asset === "DOT") {
      return BigInt(1_000_000_000); // ~0.1 DOT
    } else {
      return BigInt(100_000); // Rough USDC fee estimate
    }
  }
}
