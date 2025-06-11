/**
 * Blockchain Transaction Service for Asset Hub
 *
 * This implementation supports both real blockchain connections and mock mode for testing.
 * Real implementation uses polkadot-api for Asset Hub transactions.
 * Supports DOT and USDC transfers with proper transaction signing and monitoring.
 */

import { isSupportedAsset } from "../config.js";
import type { TipCommand } from "./types.js";
import { ed25519PairFromSeed, mnemonicToMiniSecret, ed25519Sign } from '@polkadot/util-crypto';
import { hexToU8a, u8aToHex } from '@polkadot/util';

export interface TransactionResult {
  success: boolean;
  transactionHash?: string;
  blockHash?: string;
  error?: string;
  explorerUrl?: string;
}

export interface BlockchainService {
  sendTip(tipCommand: TipCommand): Promise<TransactionResult>;
  disconnect(): Promise<void>;
}

class MySigner {
  publicKey: Uint8Array;

  constructor(publicKey: Uint8Array, private secretKey: Uint8Array) {
    this.publicKey = publicKey;
  }

  async sign(payload: Uint8Array): Promise<Uint8Array> {
    const keypair = { publicKey: this.publicKey, secretKey: this.secretKey };
    return ed25519Sign(payload, keypair);
  }
}

// Check if we're in test mode
function isTestMode(): boolean {
  return process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
}

class MockAssetHubService implements BlockchainService {
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

  async disconnect(): Promise<void> {
    // Mock disconnect - no cleanup needed
  }
}

class AssetHubService implements BlockchainService {
  private client: any;
  private api: any;
  private connected = false;
  private provider: any;
  private walletSeed: string;
  private assetHubRpc: string;

  constructor(walletSeed: string, assetHubRpc: string) {
    this.client = null;
    this.api = null;
    this.provider = null;
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
        const { asset_hub } = await import("@polkadot-api/descriptors");
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

  private async createSigner(seed: string) {
    try {
      console.log(`[BLOCKCHAIN] 🔑 Creating Ed25519 signer from seed...`);

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

      // Generate Ed25519 keypair from seed
      console.log(`[BLOCKCHAIN] 🔐 Generating Ed25519 keypair...`);
      const keyPair = ed25519PairFromSeed(seedBytes);
      const publicKey = keyPair.publicKey;
      const secretKey = keyPair.secretKey;

      console.log(`[BLOCKCHAIN] ✅ Ed25519 keypair generated`);
      console.log(`[BLOCKCHAIN] 🔑 Public key: ${u8aToHex(publicKey)}`);

      // Create MySigner instance
      const mySigner = new MySigner(publicKey, secretKey);

      // Return account ID (public key) and signer for use with signAndSend
      return {
        accountId: publicKey,
        signer: mySigner
      };
    } catch (error) {
      throw new Error(`Failed to create signer from seed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private getExplorerUrl(transactionHash: string): string {
    return `https://assethub-polkadot.subscan.io/extrinsic/${transactionHash}`;
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
      const { accountId, signer } = await this.createSigner(this.walletSeed);
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

      // Dynamic import for MultiAddress
      console.log(`[BLOCKCHAIN] 📦 Loading MultiAddress type...`);
      const { MultiAddress } = await import("@polkadot-api/descriptors");
      console.log(`[BLOCKCHAIN] ✅ MultiAddress loaded`);

      let transaction;

      if (tipCommand.asset === "DOT") {
        console.log(`[BLOCKCHAIN] 💎 Creating DOT transfer transaction using Balances pallet...`);
        // Create DOT transfer transaction using Balances pallet
        transaction = this.api.tx.Balances.transfer_keep_alive({
          dest: MultiAddress.Id(tipCommand.recipientAddress),
          value: amount,
        });
        console.log(`[BLOCKCHAIN] ✅ DOT transaction created`);
      } else if (tipCommand.asset === "USDC") {
        // USDC Asset ID on Asset Hub Polkadot (this may need to be updated)
        const usdcAssetId = 1337;
        console.log(`[BLOCKCHAIN] 🪙 Creating USDC transfer transaction using Assets pallet (asset ID: ${usdcAssetId})...`);

        // Create USDC transfer transaction using Assets pallet
        transaction = this.api.tx.Assets.transfer_keep_alive({
          id: usdcAssetId,
          target: MultiAddress.Id(tipCommand.recipientAddress),
          amount: amount,
        });
        console.log(`[BLOCKCHAIN] ✅ USDC transaction created`);
      } else {
        console.log(`[BLOCKCHAIN] ❌ Unsupported asset: ${tipCommand.asset}`);
        throw new Error(`Unsupported asset: ${tipCommand.asset}`);
      }

      console.log(`[BLOCKCHAIN] 📡 Signing and submitting transaction...`);
      console.log(`Sending ${tipCommand.amount} ${tipCommand.asset} to ${tipCommand.recipientAddress}`);

      // Sign and submit transaction with monitoring
      return new Promise((resolve, reject) => {
        let txHash: string;
        let blockHash: string;

        console.log(`[BLOCKCHAIN] 👀 Starting transaction monitoring...`);
        
        // Use signAndSend with the Ed25519 signer
        transaction.signAndSend(accountId, { signer }, (result: any) => {
          console.log(`[BLOCKCHAIN] 📡 Transaction status:`, result.status.type);

          if (result.status.isInBlock) {
            txHash = result.txHash.toHex();
            blockHash = result.status.asInBlock.toHex();
            console.log(`[BLOCKCHAIN] 🏆 Transaction included in block: ${txHash}`);
          } else if (result.status.isFinalized) {
            blockHash = result.status.asFinalized.toHex();
            console.log(`[BLOCKCHAIN] 🎯 Transaction finalized in block: ${blockHash}`);
            
            const finalResult = {
              success: true,
              transactionHash: txHash,
              blockHash: blockHash,
              explorerUrl: this.getExplorerUrl(txHash),
            };
            console.log(`[BLOCKCHAIN] 📊 Final transaction result:`, {
              txHash: finalResult.transactionHash,
              blockHash: finalResult.blockHash,
              explorerUrl: finalResult.explorerUrl
            });
            
            resolve(finalResult);
          } else if (result.status.isInvalid || result.status.isDropped || result.status.isUsurped) {
            console.error('[BLOCKCHAIN] 💥 Transaction failed:', result.status.type);
            reject({
              success: false,
              error: `Transaction failed with status: ${result.status.type}`,
            });
          }
        }).catch((error: any) => {
          console.error('[BLOCKCHAIN] 💥 Transaction submission error:', error);
          reject({
            success: false,
            error: `Transaction submission failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          });
        });
      });

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

  async disconnect(): Promise<void> {
    if (this.connected) {
      try {
        if (this.client) {
          this.client.destroy();
        }
        if (this.provider && typeof this.provider.disconnect === 'function') {
          this.provider.disconnect();
        }
        this.client = null;
        this.api = null;
        this.provider = null;
        this.connected = false;
        console.log('Disconnected from Asset Hub');
      } catch (error) {
        console.error('Error disconnecting from Asset Hub:', error);
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
