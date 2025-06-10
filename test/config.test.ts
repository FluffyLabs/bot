import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { reloadConfig, isSupportedAsset } from '../src/config.js';
import { SupportedAsset } from '../src/tipping/types.js';

describe('Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment variables before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment variables after each test
    process.env = originalEnv;
  });

  describe('loadConfig', () => {
    it('should load valid configuration', () => {
      // Set up valid environment variables
      process.env.GITHUB_ORG = 'fluffylabs';
      process.env.GITHUB_TEAM = 'core-team';
      process.env.WALLET_SEED = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
      process.env.MAX_DOT_TIP = '100';
      process.env.MAX_USDC_TIP = '1000';
      process.env.ASSET_HUB_RPC = 'wss://custom-rpc.example.com';

      const config = reloadConfig();

      expect(config.github.org).toBe('fluffylabs');
      expect(config.github.team).toBe('core-team');
      expect(config.github.botName).toBe('fluffylabs-bot');
      expect(config.blockchain.walletSeed).toBe('abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about');
      expect(config.blockchain.maxDotTip).toBe(100);
      expect(config.blockchain.maxUsdcTip).toBe(1000);
      expect(config.blockchain.assetHubRpc).toBe('wss://custom-rpc.example.com');
    });

    it('should use default RPC endpoint when not provided', () => {
      process.env.GITHUB_ORG = 'fluffylabs';
      process.env.GITHUB_TEAM = 'core-team';
      process.env.WALLET_SEED = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
      process.env.MAX_DOT_TIP = '100';
      process.env.MAX_USDC_TIP = '1000';
      // Don't set ASSET_HUB_RPC

      const config = reloadConfig();

      expect(config.blockchain.assetHubRpc).toBe('wss://polkadot-asset-hub-rpc.polkadot.io');
    });

    it('should accept hex seed format', () => {
      process.env.GITHUB_ORG = 'fluffylabs';
      process.env.GITHUB_TEAM = 'core-team';
      process.env.WALLET_SEED = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      process.env.MAX_DOT_TIP = '100';
      process.env.MAX_USDC_TIP = '1000';

      const config = reloadConfig();

      expect(config.blockchain.walletSeed).toBe('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef');
    });

    it('should accept 24 word mnemonic', () => {
      process.env.GITHUB_ORG = 'fluffylabs';
      process.env.GITHUB_TEAM = 'core-team';
      process.env.WALLET_SEED = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art';
      process.env.MAX_DOT_TIP = '100';
      process.env.MAX_USDC_TIP = '1000';

      const config = reloadConfig();

      expect(config.blockchain.walletSeed).toContain('abandon');
    });

    it('should throw error for missing GITHUB_ORG', () => {
      process.env.GITHUB_TEAM = 'core-team';
      process.env.WALLET_SEED = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
      process.env.MAX_DOT_TIP = '100';
      process.env.MAX_USDC_TIP = '1000';
      // Don't set GITHUB_ORG

      expect(() => {
        reloadConfig();
      }).toThrow('Configuration Error: Missing required environment variable: GITHUB_ORG');
    });

    it('should throw error for missing GITHUB_TEAM', () => {
      process.env.GITHUB_ORG = 'fluffylabs';
      process.env.WALLET_SEED = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
      process.env.MAX_DOT_TIP = '100';
      process.env.MAX_USDC_TIP = '1000';
      // Don't set GITHUB_TEAM

      expect(() => {
        reloadConfig();
      }).toThrow('Configuration Error: Missing required environment variable: GITHUB_TEAM');
    });

    it('should throw error for missing WALLET_SEED', () => {
      process.env.GITHUB_ORG = 'fluffylabs';
      process.env.GITHUB_TEAM = 'core-team';
      process.env.MAX_DOT_TIP = '100';
      process.env.MAX_USDC_TIP = '1000';
      // Don't set WALLET_SEED

      expect(() => {
        reloadConfig();
      }).toThrow('Configuration Error: Missing required environment variable: WALLET_SEED');
    });

    it('should throw error for missing MAX_DOT_TIP', () => {
      process.env.GITHUB_ORG = 'fluffylabs';
      process.env.GITHUB_TEAM = 'core-team';
      process.env.WALLET_SEED = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
      process.env.MAX_USDC_TIP = '1000';
      // Don't set MAX_DOT_TIP

      expect(() => {
        reloadConfig();
      }).toThrow('Configuration Error: Missing required environment variable: MAX_DOT_TIP');
    });

    it('should throw error for missing MAX_USDC_TIP', () => {
      process.env.GITHUB_ORG = 'fluffylabs';
      process.env.GITHUB_TEAM = 'core-team';
      process.env.WALLET_SEED = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
      process.env.MAX_DOT_TIP = '100';
      // Don't set MAX_USDC_TIP

      expect(() => {
        reloadConfig();
      }).toThrow('Configuration Error: Missing required environment variable: MAX_USDC_TIP');
    });

    it('should throw error for invalid MAX_DOT_TIP - non-numeric', () => {
      process.env.GITHUB_ORG = 'fluffylabs';
      process.env.GITHUB_TEAM = 'core-team';
      process.env.WALLET_SEED = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
      process.env.MAX_DOT_TIP = 'invalid';
      process.env.MAX_USDC_TIP = '1000';

      expect(() => {
        reloadConfig();
      }).toThrow('Configuration Error: MAX_DOT_TIP must be a positive number, got: invalid');
    });

    it('should throw error for invalid MAX_DOT_TIP - negative', () => {
      process.env.GITHUB_ORG = 'fluffylabs';
      process.env.GITHUB_TEAM = 'core-team';
      process.env.WALLET_SEED = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
      process.env.MAX_DOT_TIP = '-10';
      process.env.MAX_USDC_TIP = '1000';

      expect(() => {
        reloadConfig();
      }).toThrow('Configuration Error: MAX_DOT_TIP must be a positive number, got: -10');
    });

    it('should throw error for invalid MAX_DOT_TIP - zero', () => {
      process.env.GITHUB_ORG = 'fluffylabs';
      process.env.GITHUB_TEAM = 'core-team';
      process.env.WALLET_SEED = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
      process.env.MAX_DOT_TIP = '0';
      process.env.MAX_USDC_TIP = '1000';

      expect(() => {
        reloadConfig();
      }).toThrow('Configuration Error: MAX_DOT_TIP must be a positive number, got: 0');
    });

    it('should throw error for invalid wallet seed - too few words', () => {
      process.env.GITHUB_ORG = 'fluffylabs';
      process.env.GITHUB_TEAM = 'core-team';
      process.env.WALLET_SEED = 'abandon abandon abandon';
      process.env.MAX_DOT_TIP = '100';
      process.env.MAX_USDC_TIP = '1000';

      expect(() => {
        reloadConfig();
      }).toThrow('Configuration Error: WALLET_SEED must be a 12 or 24 word mnemonic phrase or hex seed');
    });

    it('should throw error for invalid wallet seed - too many words', () => {
      process.env.GITHUB_ORG = 'fluffylabs';
      process.env.GITHUB_TEAM = 'core-team';
      process.env.WALLET_SEED = 'abandon '.repeat(25).trim();
      process.env.MAX_DOT_TIP = '100';
      process.env.MAX_USDC_TIP = '1000';

      expect(() => {
        reloadConfig();
      }).toThrow('Configuration Error: WALLET_SEED must be a 12 or 24 word mnemonic phrase or hex seed');
    });

    it('should accept decimal values for max tips', () => {
      process.env.GITHUB_ORG = 'fluffylabs';
      process.env.GITHUB_TEAM = 'core-team';
      process.env.WALLET_SEED = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
      process.env.MAX_DOT_TIP = '100.5';
      process.env.MAX_USDC_TIP = '1000.25';

      const config = reloadConfig();

      expect(config.blockchain.maxDotTip).toBe(100.5);
      expect(config.blockchain.maxUsdcTip).toBe(1000.25);
    });
  });

  describe('SupportedAsset', () => {
    it('should export DOT and USDC as supported assets', () => {
      expect(SupportedAsset.DOT).toBe('DOT');
      expect(SupportedAsset.USDC).toBe('USDC');
    });
  });

  describe('isSupportedAsset', () => {
    it('should return true for supported assets', () => {
      expect(isSupportedAsset('DOT')).toBe(true);
      expect(isSupportedAsset('USDC')).toBe(true);
    });

    it('should return false for unsupported assets', () => {
      expect(isSupportedAsset('BTC')).toBe(false);
      expect(isSupportedAsset('ETH')).toBe(false);
      expect(isSupportedAsset('INVALID')).toBe(false);
    });
  });
});
