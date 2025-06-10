import type { Probot } from "probot";
import { processTipComment, containsBotMention } from "./tipping.js";

/**
 * FluffyLabs Tipping Bot
 * 
 * Command format: @fluffylabs-bot tip <address> <amount> <asset> [comment]
 * Supported assets: DOT, USDC
 */

export default (app: Probot) => {
  app.on(["issue_comment.created", "pull_request_review_comment.created"], async (context) => {
    const comment = context.payload.comment;
    const author = comment.user.login;
    
    // Skip bot comments
    if (comment.user.type === "Bot") {
      return;
    }

    // Skip comments that don't mention the bot
    if (!containsBotMention(comment.body)) {
      return;
    }

    // Process the tip comment
    const result = await processTipComment(context.octokit, comment.body, author);
    
    if (!result.success) {
      // Only reply if there's an error message (failed tip attempt)
      if (result.errorMessage) {
        await context.octokit.issues.createComment({
          ...context.issue(),
          body: `❌ ${result.errorMessage}`
        });
      }
      return;
    }

    // Tip is valid - show confirmation (TODO: implement blockchain transaction)
    const tip = result.tipCommand!;
    await context.octokit.issues.createComment({
      ...context.issue(),
      body: `✅ **Tip validated** from @${author}\n` +
            `**To**: \`${tip.recipientAddress}\`\n` +
            `**Amount**: ${tip.amount} ${tip.asset}\n` +
            `${tip.comment ? `**Message**: ${tip.comment}\n` : ''}` +
            `\n🚧 **Transaction sending not yet implemented**`
    });
  });
};
