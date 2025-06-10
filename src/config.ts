import { SupportedAsset, TippingConfig } from "./tipping/types.js";

class ConfigError extends Error {
  constructor(message: string) {
    super(`Configuration Error: ${message}`);
    this.name = "ConfigError";
  }
}

function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new ConfigError(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getOptionalEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

function getRequiredNumericEnv(key: string): number {
  const value = getRequiredEnv(key);
  const numValue = parseFloat(value);
  if (isNaN(numValue) || numValue <= 0) {
    throw new ConfigError(`${key} must be a positive number, got: ${value}`);
  }
  return numValue;
}

function validateWalletSeed(seed: string): void {
  // Basic validation - should be a valid mnemonic or hex seed
  const words = seed.trim().split(" ");
  if (words.length !== 12 && words.length !== 24 && !seed.startsWith("0x")) {
    throw new ConfigError(
      "WALLET_SEED must be a 12 or 24 word mnemonic phrase or hex seed",
    );
  }
}

function loadConfig(): TippingConfig {
  try {
    const walletSeed = getRequiredEnv("WALLET_SEED");
    validateWalletSeed(walletSeed);

    const config: TippingConfig = {
      github: {
        org: getRequiredEnv("GITHUB_ORG"),
        team: getRequiredEnv("GITHUB_TEAM"),
        botName: "fluffylabs-bot", // Hardcoded as specified in format
      },
      blockchain: {
        walletSeed,
        assetHubRpc: getOptionalEnv(
          "ASSET_HUB_RPC",
          "wss://polkadot-asset-hub-rpc.polkadot.io",
        ),
        maxDotTip: getRequiredNumericEnv("MAX_DOT_TIP"),
        maxUsdcTip: getRequiredNumericEnv("MAX_USDC_TIP"),
      },
    };

    return config;
  } catch (error) {
    if (error instanceof ConfigError) {
      throw error;
    }
    throw new ConfigError(`Failed to load configuration: ${error}`);
  }
}

// Cache the config but allow reloading
let cachedConfig: TippingConfig | null = null;

// Export function to get config (loads once, then caches)
export function getConfig(): TippingConfig {
  if (!cachedConfig) {
    cachedConfig = loadConfig();
  }
  return cachedConfig;
}

// Export function to reload config (useful for tests)
export function reloadConfig(): TippingConfig {
  cachedConfig = null;
  return getConfig();
}

// Export the config getter function instead of eager loading
// Use getConfig() or reloadConfig() in your code instead of importing config directly

// Export asset validation function
export function isSupportedAsset(
  asset: string,
): asset is keyof typeof SupportedAsset {
  return Object.values(SupportedAsset).includes(asset as SupportedAsset);
}
