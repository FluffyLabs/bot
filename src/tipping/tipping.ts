import { CommentParser } from "./parser.js";
import { checkAuthorization } from "./authorization.js";
import { getConfig } from "../config.js";
import type { TipProcessingResult } from "./types.js";
import { GitHubApi } from "../types.js";

/**
 * Process a comment for tip commands with full validation
 */
export async function processTipComment(
  octokit: GitHubApi,
  commentBody: string,
  author: string,
): Promise<TipProcessingResult> {
  // Parse the comment
  const parseResult = CommentParser.parseComment(commentBody);

  if (!parseResult.success) {
    // Only return error for actual tip attempts
    if (
      parseResult.error !== "Comment does not mention the bot" &&
      parseResult.error !== "Comment does not contain a tip command"
    ) {
      return {
        success: false,
        errorMessage: `Invalid tip command: ${parseResult.error}`,
      };
    }
    return { success: false }; // Silent fail for non-tip comments
  }

  const tipCommand = parseResult.tipCommand!;

  // Check authorization
  const authResult = await checkAuthorization(octokit, author);

  if (!authResult.isAuthorized) {
    return {
      success: false,
      tipCommand,
      errorMessage: `Authorization failed: ${authResult.reason}`,
    };
  }

  // Validate tip amount against limits
  const config = getConfig();
  const maxAmount =
    tipCommand.asset === "DOT"
      ? config.blockchain.maxDotTip
      : config.blockchain.maxUsdcTip;

  if (tipCommand.amount > maxAmount) {
    return {
      success: false,
      tipCommand,
      errorMessage: `Tip amount ${tipCommand.amount} ${tipCommand.asset} exceeds maximum of ${maxAmount} ${tipCommand.asset}`,
    };
  }

  return {
    success: true,
    tipCommand,
    authorizedUser: author,
  };
}

/**
 * Check if a comment contains a bot mention (for filtering)
 */
export function containsBotMention(commentBody: string): boolean {
  return CommentParser.containsBotMention(commentBody);
}
