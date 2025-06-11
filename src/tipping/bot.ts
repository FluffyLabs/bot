import { Probot } from "probot";
import { containsBotMention, processTipComment } from "./tipping.js";
import { getBlockchainService } from "./blockchain.js";
import { getConfig } from "../config.js";

export function setupTippingBot(app: Probot) {
  app.on(
    ["issue_comment.created", "pull_request_review_comment.created"],
    async (context) => {
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

      // Load config
      const config = getConfig();

      // Process the tip comment
      const result = await processTipComment(
        context.octokit,
        comment.body,
        author,
        config.github.org,
        config.github.team,
        config.blockchain.maxDotTip,
        config.blockchain.maxUsdcTip,
      );

      if (!result.success) {
        // Only reply if there's an error message (failed tip attempt)
        if (result.errorMessage) {
          await context.octokit.issues.createComment({
            ...context.issue(),
            body: `❌ ${result.errorMessage}`,
          });
        }
        return;
      }

      // Tip is valid - send blockchain transaction
      const tip = result.tipCommand!;

      // Post initial confirmation
      await context.octokit.issues.createComment({
        ...context.issue(),
        body:
          `⏳ **Processing tip** from @${author}\n` +
          `**To**: \`${tip.recipientAddress}\`\n` +
          `**Amount**: ${tip.amount} ${tip.asset}\n` +
          `${tip.comment ? `**Message**: ${tip.comment}\n` : ""}` +
          `\n🔄 Sending transaction...`,
      });

      // Send the blockchain transaction
      const blockchainService = getBlockchainService(
        config.blockchain.walletSeed,
        config.blockchain.assetHubRpc
      );
      const txResult = await blockchainService.sendTip(tip);

      // Post transaction result
      if (txResult.success) {
        await context.octokit.issues.createComment({
          ...context.issue(),
          body:
            `✅ **Tip sent successfully!** 🎉\n` +
            `**From**: @${author}\n` +
            `**To**: \`${tip.recipientAddress}\`\n` +
            `**Amount**: ${tip.amount} ${tip.asset}\n` +
            `${tip.comment ? `**Message**: ${tip.comment}\n` : ""}` +
            `\n**Transaction Hash**: \`${txResult.transactionHash}\`\n` +
            `**Block Hash**: \`${txResult.blockHash}\`\n` +
            `${txResult.explorerUrl ? `**Explorer**: ${txResult.explorerUrl}\n` : ""}`,
        });
      } else {
        await context.octokit.issues.createComment({
          ...context.issue(),
          body:
            `❌ **Transaction failed**\n` +
            `**Error**: ${txResult.error}\n` +
            `\nPlease check the configuration and try again.`,
        });
      }
    },
  );
}
