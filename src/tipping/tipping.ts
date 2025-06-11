import { CommentParser } from "./parser.js";
import { checkAuthorization } from "./authorization.js";
import type { TipProcessingResult } from "./types.js";
import { GitHubApi } from "../types.js";

/**
 * Process a comment for tip commands with full validation
 */
export async function processTipComment(
  octokit: GitHubApi,
  commentBody: string,
  author: string,
  org: string,
  team: string,
  maxDotTip: number,
  maxUsdcTip: number,
): Promise<TipProcessingResult> {
  console.log(`[TIPPING] 🔍 Starting tip processing for @${author}`);
  console.log(`[TIPPING] 📝 Comment to parse: "${commentBody}"`);
  
  // Parse the comment
  console.log(`[TIPPING] 🧩 Parsing comment...`);
  const parseResult = CommentParser.parseComment(commentBody);
  console.log(`[TIPPING] 📊 Parse result:`, { success: parseResult.success, error: parseResult.error });

  if (!parseResult.success) {
    // Only return error for actual tip attempts
    if (
      parseResult.error !== "Comment does not mention the bot" &&
      parseResult.error !== "Comment does not contain a tip command"
    ) {
      console.log(`[TIPPING] ❌ Invalid tip command: ${parseResult.error}`);
      
      // Still check authorization for invalid tip commands
      console.log(`[TIPPING] 🔐 Checking authorization for invalid tip command from @${author}...`);
      const authResult = await checkAuthorization(octokit, author, org, team);
      console.log(`[TIPPING] 🔓 Authorization result:`, { 
        isAuthorized: authResult.isAuthorized, 
        reason: authResult.reason 
      });

      return {
        success: false,
        errorMessage: `Invalid tip command: ${parseResult.error}`,
        isAuthorized: authResult.isAuthorized,
        isTipAttempt: true,
      };
    }
    console.log(`[TIPPING] 🚫 Not a tip command, silent fail: ${parseResult.error}`);
    return { success: false, isAuthorized: false, isTipAttempt: false }; // Silent fail for non-tip comments
  }

  const tipCommand = parseResult.tipCommand!;
  console.log(`[TIPPING] ✅ Successfully parsed tip command:`, {
    recipient: tipCommand.recipientAddress,
    amount: tipCommand.amount,
    asset: tipCommand.asset,
    comment: tipCommand.comment || 'none'
  });

  // Check authorization
  console.log(`[TIPPING] 🔐 Checking authorization for @${author} in ${org}/${team}...`);
  const authResult = await checkAuthorization(octokit, author, org, team);
  console.log(`[TIPPING] 🔓 Authorization result:`, { 
    isAuthorized: authResult.isAuthorized, 
    reason: authResult.reason 
  });

  if (!authResult.isAuthorized) {
    console.log(`[TIPPING] ❌ Authorization failed: ${authResult.reason}`);
    return {
      success: false,
      tipCommand,
      errorMessage: `Authorization failed: ${authResult.reason}`,
      isAuthorized: false,
      isTipAttempt: true,
    };
  }

  console.log(`[TIPPING] ✅ User @${author} is authorized to send tips`);

  // Validate tip amount against limits
  const maxAmount =
    tipCommand.asset === "DOT"
      ? maxDotTip
      : maxUsdcTip;

  console.log(`[TIPPING] 💰 Validating tip amount: ${tipCommand.amount} ${tipCommand.asset} (max: ${maxAmount})`);

  if (tipCommand.amount > maxAmount) {
    console.log(`[TIPPING] ❌ Tip amount exceeds limit: ${tipCommand.amount} > ${maxAmount} ${tipCommand.asset}`);
    return {
      success: false,
      tipCommand,
      errorMessage: `Tip amount ${tipCommand.amount} ${tipCommand.asset} exceeds maximum of ${maxAmount} ${tipCommand.asset}`,
      isAuthorized: true,
      isTipAttempt: true,
    };
  }

  console.log(`[TIPPING] ✅ Tip amount is within limits`);
  console.log(`[TIPPING] 🎉 Tip processing successful! Ready for blockchain transaction`);

  return {
    success: true,
    tipCommand,
    authorizedUser: author,
    isAuthorized: true,
    isTipAttempt: true,
  };
}

/**
 * Check if a comment contains a bot mention (for filtering)
 */
export function containsBotMention(commentBody: string): boolean {
  const hasMention = CommentParser.containsBotMention(commentBody);
  console.log(`[TIPPING] 👀 Bot mention check: ${hasMention ? 'FOUND' : 'NOT FOUND'}`);
  return hasMention;
}
