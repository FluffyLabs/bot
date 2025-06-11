#!/usr/bin/env node

/**
 * CLI tool for testing tip transactions
 *
 * Usage: npm run send-tip "@fluffylabs-bot tip <address> <amount> <asset> [comment]"
 *
 * This tool allows you to test blockchain transactions directly without going through GitHub,
 * which is useful for debugging blockchain connectivity and transaction issues.
 */

import { config } from 'dotenv';
import { CommentParser } from '../src/tipping/parser.js';
import { getBlockchainService, disconnectBlockchain } from '../src/tipping/blockchain.js';
import { getConfig } from '../src/config.js';
config();

function printUsage() {
  console.log('🤖 FluffyLabs Tip CLI\n');
  console.log('Usage:');
  console.log('  npm run send-tip "@fluffylabs-bot tip <address> <amount> <asset> [comment]"');
  console.log('');
  console.log('Examples:');
  console.log('  npm run send-tip "@fluffylabs-bot tip 12uGtv6u5vvUcog67hfLXqrM5anMhyoNuhtp8M1nyQtonwSK 10 DOT great work!"');
  console.log('  npm run send-tip "@fluffylabs-bot tip 12uGtv6u5vvUcog67hfLXqrM5anMhyoNuhtp8M1nyQtonwSK 100 USDC"');
  console.log('');
  console.log('Environment variables required:');
  console.log('  WALLET_SEED       - Wallet seed phrase or hex');
  console.log('  ASSET_HUB_RPC     - Asset Hub RPC endpoint (optional)');
  console.log('  MAX_DOT_TIP       - Maximum DOT tip amount');
  console.log('  MAX_USDC_TIP      - Maximum USDC tip amount');
  console.log('');
}

function printConfig(config: any) {
  console.log('📋 Configuration:');
  console.log(`  Asset Hub RPC: ${config.blockchain.assetHubRpc}`);
  console.log(`  Max DOT tip: ${config.blockchain.maxDotTip} DOT`);
  console.log(`  Max USDC tip: ${config.blockchain.maxUsdcTip} USDC`);
  console.log(`  Wallet seed: ${config.blockchain.walletSeed.substring(0, 20)}...`);
  console.log('');
}

async function main() {
  try {
    // Get command line arguments
    const args = process.argv.slice(2);

    if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
      printUsage();
      process.exit(0);
    }

    const tipCommand = args.join(' ');
    console.log('🚀 FluffyLabs Tip CLI Starting...\n');
    console.log(`💬 Processing command: "${tipCommand}"`);
    console.log('');

    // Load configuration
    console.log('⚙️ Loading configuration...');
    const config = getConfig();
    printConfig(config);

    // Parse the tip command
    console.log('🧩 Parsing tip command...');
    const parseResult = CommentParser.parseComment(tipCommand);

    if (!parseResult.success) {
      console.error(`❌ Failed to parse tip command: ${parseResult.error}`);
      console.log('');
      printUsage();
      process.exit(1);
    }

    const tip = parseResult.tipCommand!;
    console.log('✅ Tip command parsed successfully:');
    console.log(`  Recipient: ${tip.recipientAddress}`);
    console.log(`  Amount: ${tip.amount} ${tip.asset}`);
    console.log(`  Comment: ${tip.comment || 'none'}`);
    console.log('');

    // Validate tip amount against limits
    const maxAmount = tip.asset === 'DOT' ? config.blockchain.maxDotTip : config.blockchain.maxUsdcTip;
    if (tip.amount > maxAmount) {
      console.error(`❌ Tip amount ${tip.amount} ${tip.asset} exceeds maximum of ${maxAmount} ${tip.asset}`);
      process.exit(1);
    }

    console.log('💰 Tip amount is within limits');
    console.log('');

    // Initialize blockchain service
    console.log('🔗 Initializing blockchain service...');
    const blockchainService = getBlockchainService(
      config.blockchain.walletSeed,
      config.blockchain.assetHubRpc
    );
    console.log('✅ Blockchain service initialized');
    console.log('');

    // Check wallet balance first
    console.log('💳 Checking wallet balance...');
    const balanceResult = await blockchainService.checkBalance();

    if (balanceResult.success) {
      const dotBalance = Number(balanceResult.dotBalance) / 10_000_000_000;
      const usdcBalance = Number(balanceResult.usdcBalance) / 1_000_000;

      console.log('✅ Wallet balance:');
      console.log(`  DOT: ${dotBalance.toFixed(4)} DOT`);
      console.log(`  USDC: ${usdcBalance.toFixed(2)} USDC`);

      if (tip.asset === 'DOT' && dotBalance < tip.amount) {
        console.error(`❌ Insufficient DOT balance: need ${tip.amount} DOT, have ${dotBalance.toFixed(4)} DOT`);
        process.exit(1);
      }

      if (tip.asset === 'USDC' && usdcBalance < tip.amount) {
        console.error(`❌ Insufficient USDC balance: need ${tip.amount} USDC, have ${usdcBalance.toFixed(2)} USDC`);
        process.exit(1);
      }

      console.log('✅ Sufficient balance available');
    } else {
      console.warn(`⚠️ Could not check wallet balance: ${balanceResult.error}`);
      console.log('Proceeding with transaction anyway...');
    }
    console.log('');

    // Send the tip
    console.log('📡 Sending blockchain transaction...');
    console.log(`Sending ${tip.amount} ${tip.asset} to ${tip.recipientAddress}`);
    if (tip.comment) {
      console.log(`Message: "${tip.comment}"`);
    }
    console.log('');

    const txResult = await blockchainService.sendTip(tip);

    // Display results
    console.log('📊 Transaction Result:');
    console.log('='.repeat(50));

    if (txResult.success) {
      console.log('🎉 Transaction successful!');
      console.log(`Transaction Hash: ${txResult.transactionHash}`);
      console.log(`Block Hash: ${txResult.blockHash}`);
      console.log(`Explorer URL: ${txResult.explorerUrl}`);
    } else {
      console.log('❌ Transaction failed!');
      console.log(`Error: ${txResult.error}`);
    }

    console.log('='.repeat(50));

  } catch (error) {
    console.error('💥 CLI Error:', error instanceof Error ? error.message : 'Unknown error');
    console.error('');

    if (error instanceof Error && error.message.includes('Configuration Error')) {
      console.log('💡 Make sure all required environment variables are set:');
      console.log('  WALLET_SEED, MAX_DOT_TIP, MAX_USDC_TIP');
      console.log('');
      console.log('Example:');
      console.log('  export WALLET_SEED="abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"');
      console.log('  export MAX_DOT_TIP="100"');
      console.log('  export MAX_USDC_TIP="1000"');
      console.log('  export ASSET_HUB_RPC="wss://polkadot-asset-hub-rpc.polkadot.io"');
    }

    process.exit(1);
  } finally {
    // Clean up
    try {
      await disconnectBlockchain();
      console.log('🔌 Blockchain service disconnected');
    } catch (error) {
      console.warn('⚠️ Error disconnecting blockchain service:', error instanceof Error ? error.message : 'Unknown error');
    }
  }
}

// Handle process termination gracefully
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  try {
    await disconnectBlockchain();
  } catch (error) {
    console.warn('⚠️ Error during cleanup:', error instanceof Error ? error.message : 'Unknown error');
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  try {
    await disconnectBlockchain();
  } catch (error) {
    console.warn('⚠️ Error during cleanup:', error instanceof Error ? error.message : 'Unknown error');
  }
  process.exit(0);
});

// Run the CLI
main().catch((error) => {
  console.error('💥 Unhandled error:', error);
  process.exit(1);
});
