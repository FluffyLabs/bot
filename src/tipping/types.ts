export interface TipCommand {
  recipientAddress: string;
  amount: number;
  asset: 'DOT' | 'USDC';
  comment?: string;
  rawComment: string;
}

export interface ParseResult {
  success: boolean;
  tipCommand?: TipCommand;
  error?: string;
}

export interface TipProcessingResult {
  success: boolean;
  tipCommand?: TipCommand;
  errorMessage?: string;
  authorizedUser?: string;
  isAuthorized?: boolean;
  isTipAttempt?: boolean;
}

export interface TippingConfig {
  github: {
    org: string;
    team: string;
    botName: string;
  };
  blockchain: {
    walletSeed: string;
    assetHubRpc: string;
    maxDotTip: number;
    maxUsdcTip: number;
  };
}

// Supported assets enum
export enum SupportedAsset {
  DOT = 'DOT',
  USDC = 'USDC',
}
