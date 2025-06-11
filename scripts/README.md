# FluffyLabs Tip CLI

A command-line tool for testing blockchain tip transactions directly, without going through GitHub. This is useful for debugging blockchain connectivity and transaction issues.

## Overview

The Tip CLI allows you to:
- Test blockchain transactions directly
- Debug connection issues to Asset Hub
- Validate wallet configuration
- Check wallet balances
- Send real DOT and USDC tips

## Setup

### 1. Environment Variables

Create a `.env` file in the project root with the following variables:

```bash
# Required
WALLET_SEED="your-12-or-24-word-mnemonic-or-hex-seed"
MAX_DOT_TIP="100"
MAX_USDC_TIP="1000"

# Optional
ASSET_HUB_RPC="wss://polkadot-asset-hub-rpc.polkadot.io"
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Build the Project

```bash
npm run build
```

## Usage

```bash
npm run send-tip "@fluffylabs-bot tip <address> <amount> <asset> [comment]"
```

## Examples

### Basic DOT tip
```bash
npm run send-tip "@fluffylabs-bot tip 12uGtv6u5vvUcog67hfLXqrM5anMhyoNuhtp8M1nyQtonwSK 10 DOT"
```
### USDC tip
```bash
npm run send-tip "@fluffylabs-bot tip 12uGtv6u5vvUcog67hfLXqrM5anMhyoNuhtp8M1nyQtonwSK 100 USDC excellent contribution"
```

## What the CLI Does

1. **Parses the command** - Uses the same parser as the GitHub bot
2. **Loads configuration** - Reads environment variables and validates them
3. **Validates the tip** - Checks address format, amount limits, and asset support
4. **Checks wallet balance** - Verifies you have sufficient funds
5. **Sends transaction** - Submits the transaction to Asset Hub
6. **Monitors progress** - Tracks transaction from submission to finalization
7. **Reports results** - Shows transaction hash, block hash, and explorer URL

## Output Example

```
🚀 FluffyLabs Tip CLI Starting...

💬 Processing command: "@fluffylabs-bot tip 12uGtv6u5vvUcog67hfLXqrM5anMhyoNuhtp8M1nyQtonwSK 10 DOT great work!"

⚙️ Loading configuration...
📋 Configuration:
  Asset Hub RPC: wss://polkadot-asset-hub-rpc.polkadot.io
  Max DOT tip: 100 DOT
  Max USDC tip: 1000 USDC
  Wallet seed: abandon abandon aban...

🧩 Parsing tip command...
✅ Tip command parsed successfully:
  Recipient: 12uGtv6u5vvUcog67hfLXqrM5anMhyoNuhtp8M1nyQtonwSK
  Amount: 10 DOT
  Comment: great work!

💰 Tip amount is within limits

🔗 Initializing blockchain service...
✅ Blockchain service initialized

💳 Checking wallet balance...
✅ Wallet balance:
  DOT: 1000.0000 DOT
  USDC: 5000.00 USDC
✅ Sufficient balance available

📡 Sending blockchain transaction...
Sending 10 DOT to 12uGtv6u5vvUcog67hfLXqrM5anMhyoNuhtp8M1nyQtonwSK
Message: "great work!"

📊 Transaction Result:
==================================================
🎉 Transaction successful!
Transaction Hash: 0x1234567890abcdef...
Block Hash: 0xabcdef1234567890...
Explorer URL: https://assethub-polkadot.subscan.io/extrinsic/0x1234567890abcdef...
==================================================

🔌 Blockchain service disconnected
```

## Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `WALLET_SEED` | Yes | 12/24 word mnemonic or hex seed | `"abandon abandon abandon..."` |
| `MAX_DOT_TIP` | Yes | Maximum DOT amount per tip | `"100"` |
| `MAX_USDC_TIP` | Yes | Maximum USDC amount per tip | `"1000"` |
| `ASSET_HUB_RPC` | No | Asset Hub RPC endpoint | `"wss://polkadot-asset-hub-rpc.polkadot.io"` |

### Wallet Seed Formats

The CLI accepts wallet seeds in multiple formats:

**12-word mnemonic:**
```bash
WALLET_SEED="abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
```

**24-word mnemonic:**
```bash
WALLET_SEED="abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art"
```

**Hex seed:**
```bash
WALLET_SEED="0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
```

## Supported Assets

- **DOT** - Native Polkadot token (10 decimal places)
- **USDC** - USD Coin on Asset Hub (6 decimal places, Asset ID 1337)

## Address Format

The CLI accepts Polkadot SS58 addresses (47-48 characters):
- Example: `12uGtv6u5vvUcog67hfLXqrM5anMhyoNuhtp8M1nyQtonwSK`

## Help

Get help by running:
```bash
npm run send-tip --help
```
