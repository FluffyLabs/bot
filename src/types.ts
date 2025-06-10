import type { Context } from "probot";

// Use Probot's context octokit type which includes the rest property
export type GitHubApi = Context['octokit'];

// Membership state types
export type MembershipState = "active" | "pending";

// GitHub API response types (simplified)
export interface TeamMembershipResponse {
  state: MembershipState;
  role?: string;
}

export interface OrgMembershipResponse {
  state: MembershipState;
  role?: string;
}

export interface TeamResponse {
  slug: string;
  name: string;
  id: number;
}

// Our custom interfaces
export interface MembershipResult {
  isMember: boolean;
  state?: MembershipState;
  error?: string;
}

export interface AuthorizationResult {
  isAuthorized: boolean;
  reason?: string;
  membershipDetails?: MembershipResult;
}

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

// GitHub API error interface
export interface GitHubApiError extends Error {
  status?: number;
  message: string;
}