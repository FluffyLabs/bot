import type { Context } from "probot";
import type { TipCommand } from "./tipping/types.js";

// Use Probot's context octokit type which includes the rest property
export type GitHubApi = Context["octokit"];

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

// GitHub API error interface
export interface GitHubApiError extends Error {
  status?: number;
  message: string;
}

// Blockchain transaction result interface
export interface TransactionResult {
  success: boolean;
  transactionHash?: string;
  blockHash?: string;
  error?: string;
  explorerUrl?: string;
}

// Blockchain service interface
export interface BlockchainService {
  sendTip(tipCommand: TipCommand): Promise<TransactionResult>;
  disconnect(): Promise<void>;
}
