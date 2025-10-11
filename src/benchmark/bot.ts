import { Probot } from "probot";
import { BenchmarkParser } from "./parser.js";
import { processBenchmarkComment, triggerBenchmarkWorkflow } from "./benchmark.js";
import { getBotConfig } from "../config.js";

/**
 * FluffyLabs Benchmark Bot
 *
 * Command format: @fluffylabs-bot benchmark
 * Triggers benchmark workflow in target repository
 */
export function setupBenchmarkBot(app: Probot) {
  app.on(
    ["issue_comment.created", "pull_request_review_comment.created"],
    async (context) => {
      const comment = context.payload.comment;
      const author = comment.user.login;

      // Skip bot comments
      if (comment.user.type === "Bot") {
        return;
      }

      // Quick check if this might be a benchmark command
      if (!BenchmarkParser.containsBenchmarkCommand(comment.body)) {
        return;
      }

      context.log.info(`[BENCHMARK_BOT] 🎯 Benchmark command detected from @${author}`);
      context.log.info(`[BENCHMARK_BOT] 💬 Comment body: "${comment.body}"`);

      // Load config
      context.log.info(`[BENCHMARK_BOT] ⚙️ Loading configuration...`);
      const config = getBotConfig();

      // Check if benchmark feature is enabled
      if (!config.benchmark) {
        context.log.info(`[BENCHMARK_BOT] ⚠️ Benchmark feature is not configured, ignoring command`);
        return;
      }

      context.log.info(`[BENCHMARK_BOT] ✅ Config loaded - org: ${config.github.org}, team: ${config.github.team}`);

      // Check if this is a pull request and get PR number
      let prNumber: number | undefined;

      if ('issue' in context.payload && context.payload.issue) {
        prNumber = context.payload.issue.number;
      } else if ('pull_request' in context.payload && context.payload.pull_request) {
        prNumber = context.payload.pull_request.number;
      }

      if (!prNumber) {
        context.log.info(`[BENCHMARK_BOT] ❌ Could not determine PR number or not a pull request`);
        await context.octokit.reactions.createForIssueComment({
          ...context.issue(),
          comment_id: comment.id,
          content: "-1",
        });
        return;
      }

      context.log.info(`[BENCHMARK_BOT] 🔢 PR number: ${prNumber}`);

      // Get repository information
      const repoName = context.payload.repository.name;

      // Process the benchmark comment
      context.log.info(`[BENCHMARK_BOT] 🔍 Processing benchmark comment from @${author}...`);
      const result = await processBenchmarkComment(
        context.octokit,
        comment.body,
        author,
        config.github.org,
        config.github.team,
        repoName,
        config.benchmark,
      );
      context.log.info(`[BENCHMARK_BOT] 📊 Benchmark processing result: success=${result.success}, errorMessage=${result.errorMessage}`);

      // Add reaction based on result
      if (result.isBenchmarkAttempt) {
        if (result.isAuthorized && result.success) {
          context.log.info(`[BENCHMARK_BOT] 👁️ Adding 'eyes' reaction for authorized user`);
          await context.octokit.reactions.createForIssueComment({
            ...context.issue(),
            comment_id: comment.id,
            content: "eyes",
          });
        } else {
          context.log.info(`[BENCHMARK_BOT] 👎 Adding 'thumbsdown' reaction for unauthorized/failed attempt`);
          await context.octokit.reactions.createForIssueComment({
            ...context.issue(),
            comment_id: comment.id,
            content: "-1",
          });
        }
      }

      if (!result.success) {
        // Only reply with error message to authorized users who attempted a benchmark command
        if (result.errorMessage && result.isBenchmarkAttempt && result.isAuthorized) {
          context.log.info(`[BENCHMARK_BOT] ❌ Benchmark processing failed: ${result.errorMessage}`);
          context.log.info(`[BENCHMARK_BOT] 💬 Posting error message to GitHub...`);
          await context.octokit.issues.createComment({
            ...context.issue(),
            body: `❌ ${result.errorMessage}`,
          });
          context.log.info(`[BENCHMARK_BOT] ✅ Error message posted`);
        } else {
          context.log.info(`[BENCHMARK_BOT] 🚫 Benchmark processing failed silently (no error message to post)`);
        }
        return;
      }

      // Benchmark command is valid - trigger workflow
      context.log.info(`[BENCHMARK_BOT] ✅ Benchmark command is valid!`);
      context.log.info(`[BENCHMARK_BOT] 🚀 Triggering benchmark workflow for PR #${prNumber}...`);

      // Post initial confirmation
      context.log.info(`[BENCHMARK_BOT] 💬 Posting initial confirmation to GitHub...`);
      const initialComment = await context.octokit.issues.createComment({
        ...context.issue(),
        body:
          `⏳ **Triggering benchmark** for PR #${prNumber}\n` +
          `**Requested by**: @${author}\n` +
          `**Target repository**: ${config.github.org}/${config.benchmark.targetRepo}\n` +
          `\n🔄 Starting workflow...`,
      });
      context.log.info(`[BENCHMARK_BOT] ✅ Initial confirmation posted`);

      // Trigger the workflow
      const workflowResult = await triggerBenchmarkWorkflow(
        context.octokit,
        config.github.org,
        prNumber,
        config.benchmark,
      );
      context.log.info(`[BENCHMARK_BOT] 📡 Workflow trigger result: success=${workflowResult.success}, error=${workflowResult.error}`);

      // Update initial comment with result
      if (workflowResult.success) {
        context.log.info(`[BENCHMARK_BOT] 🎉 Workflow triggered successfully! Updating comment...`);
        await context.octokit.issues.updateComment({
          ...context.issue(),
          comment_id: initialComment.data.id,
          body:
            `✅ **Benchmark workflow triggered successfully!** 🎉\n` +
            `**Requested by**: @${author}\n` +
            `**PR number**: #${prNumber}\n` +
            `**Target repository**: ${config.github.org}/${config.benchmark.targetRepo}\n` +
            `\n🔗 Check the [Actions tab](https://github.com/${config.github.org}/${config.benchmark.targetRepo}/actions/workflows/${config.benchmark.workflowFile}) for workflow progress.`,
        });
        context.log.info(`[BENCHMARK_BOT] ✅ Success message updated - benchmark processing complete!`);
      } else {
        context.log.info(`[BENCHMARK_BOT] ❌ Workflow trigger failed! Updating comment...`);
        await context.octokit.issues.updateComment({
          ...context.issue(),
          comment_id: initialComment.data.id,
          body:
            `❌ **Failed to trigger benchmark workflow**\n` +
            `**Requested by**: @${author}\n` +
            `**PR number**: #${prNumber}\n` +
            `\n**Error**: ${workflowResult.error}`,
        });
        context.log.info(`[BENCHMARK_BOT] ✅ Error message updated - benchmark processing complete with failure`);
      }
    },
  );
}
