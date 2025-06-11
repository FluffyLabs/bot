import { Probot } from "probot";
import { containsBotMention, processTipComment } from "./tipping.js";
import { getBlockchainService } from "./blockchain.js";
import { getConfig } from "../config.js";

/**
 * FluffyLabs Tipping Bot
 *
 * Command format: @fluffylabs-bot tip <address> <amount> <asset> [comment]
 * Supported assets: DOT, USDC
 */
export function setupTippingBot(app: Probot) {
  app.on(
    [
      "issue_comment.created", "pull_request_review_comment.created"],
    async (context) => {
      const comment = context.payload.comment;
      const author = comment.user.login;

      context.log.info(`[BOT] 📝 New comment received from @${author}`);

      // Skip bot comments
      if (comment.user.type === "Bot") {
        context.log.info(`[BOT] 🤖 Skipping bot comment from ${author}`);
        return;
      }

      // Skip comments that don't mention the bot
      if (!containsBotMention(comment.body)) {
        context.log.info(`[BOT] 👀 Comment doesn't mention bot, skipping`);
        return;
      }

      context.log.info(`[BOT] 💬 Comment body: "${comment.body}"`);
      context.log.info(`[BOT] 🎯 Bot mentioned in comment, processing...`);

      // Load config
      context.log.info(`[BOT] ⚙️ Loading configuration...`);
      const config = getConfig();
      context.log.info(`[BOT] ✅ Config loaded - org: ${config.github.org}, team: ${config.github.team}`);

      // Process the tip comment
      context.log.info(`[BOT] 🔍 Processing tip comment from @${author}...`);
      const result = await processTipComment(
        context.octokit,
        comment.body,
        author,
        config.github.org,
        config.github.team,
        config.blockchain.maxDotTip,
        config.blockchain.maxUsdcTip,
      );
      context.log.info(`[BOT] 📊 Tip processing result:`, { success: result.success, errorMessage: result.errorMessage });

      // Add reaction when a tip command is detected
      if (result.tipCommand || result.isTipAttempt) {
        if (result.isAuthorized) {
          context.log.info(`[BOT] 👁️ Adding 'eyes' reaction for authorized user`);
          await context.octokit.reactions.createForIssueComment({
            ...context.issue(),
            comment_id: comment.id,
            content: "eyes",
          });
        } else {
          context.log.info(`[BOT] 👎 Adding 'thumbsdown' reaction for unauthorized user`);
          await context.octokit.reactions.createForIssueComment({
            ...context.issue(),
            comment_id: comment.id,
            content: "-1",
          });
        }
      }

      if (!result.success) {
        // Only reply with error message to authorized users who attempted a tip command
        if (result.errorMessage && result.isTipAttempt && result.isAuthorized) {
          context.log.info(`[BOT] ❌ Tip processing failed: ${result.errorMessage}`);
          context.log.info(`[BOT] 💬 Posting error message to GitHub...`);
          await context.octokit.issues.createComment({
            ...context.issue(),
            body: `❌ ${result.errorMessage}`,
          });
          context.log.info(`[BOT] ✅ Error message posted`);
        } else {
          context.log.info(`[BOT] 🚫 Tip processing failed silently (no error message to post)`);
        }
        return;
      }

      // Tip is valid - send blockchain transaction
      const tip = result.tipCommand!;
      context.log.info(`[BOT] ✅ Tip is valid!`);
      context.log.info(`[BOT] 💰 Tip details:`, {
        recipient: tip.recipientAddress,
        amount: tip.amount,
        asset: tip.asset,
        comment: tip.comment || 'none'
      });

      // Post initial confirmation
      context.log.info(`[BOT] 💬 Posting initial confirmation to GitHub...`);
      const initialComment = await context.octokit.issues.createComment({
        ...context.issue(),
        body:
          `⏳ **Processing tip** from @${author}\n` +
          `**To**: \`${tip.recipientAddress}\`\n` +
          `**Amount**: ${tip.amount} ${tip.asset}\n` +
          `${tip.comment ? `**Message**: ${tip.comment}\n` : ""}` +
          `\n🔄 Sending transaction...`,
      });
      context.log.info(`[BOT] ✅ Initial confirmation posted`);

      // Send the blockchain transaction
      context.log.info(`[BOT] 🔗 Initializing blockchain service...`);
      const blockchainService = getBlockchainService(
        config.blockchain.walletSeed,
        config.blockchain.assetHubRpc
      );
      context.log.info(`[BOT] 🚀 Sending blockchain transaction...`);
      const txResult = await blockchainService.sendTip(tip);
      context.log.info(`[BOT] 📡 Blockchain transaction result:`, {
        success: txResult.success,
        txHash: txResult.transactionHash,
        error: txResult.error
      });

      // Update initial comment with transaction result
      if (txResult.success) {
        context.log.info(`[BOT] 🎉 Transaction successful! Updating initial comment...`);
        await context.octokit.issues.updateComment({
          ...context.issue(),
          comment_id: initialComment.data.id,
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
        context.log.info(`[BOT] ✅ Success message updated - tip processing complete!`);
      } else {
        context.log.info(`[BOT] ❌ Transaction failed! Updating initial comment...`);
        await context.octokit.issues.updateComment({
          ...context.issue(),
          comment_id: initialComment.data.id,
          body:
            `❌ **Transaction failed**\n` +
            `**From**: @${author}\n` +
            `**To**: \`${tip.recipientAddress}\`\n` +
            `**Amount**: ${tip.amount} ${tip.asset}\n` +
            `${tip.comment ? `**Message**: ${tip.comment}\n` : ""}` +
            `\n**Error**: ${txResult.error}\n` +
            `\nPlease check the configuration and try again.`,
        });
        context.log.info(`[BOT] ✅ Error message updated - tip processing complete with failure`);
      }
    },
  );
}
