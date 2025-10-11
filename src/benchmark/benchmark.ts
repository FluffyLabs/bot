import { BenchmarkParser } from "./parser.js";
import { checkAuthorization } from "../common/authorization.js";
import type { BenchmarkProcessingResult, BenchmarkConfig } from "./types.js";
import type { GitHubApi } from "../types.js";

/**
 * Process a comment for benchmark commands with full validation
 */
export async function processBenchmarkComment(
  octokit: GitHubApi,
  commentBody: string,
  author: string,
  org: string,
  team: string,
  repoName: string,
  benchmarkConfig: BenchmarkConfig,
): Promise<BenchmarkProcessingResult> {
  console.log(`[BENCHMARK] 🔍 Starting benchmark processing for @${author}`);
  console.log(`[BENCHMARK] 📝 Comment to parse: "${commentBody}"`);
  console.log(`[BENCHMARK] 🏠 Repository: ${org}/${repoName}`);

  // Check if this is the allowed source repository
  if (repoName !== benchmarkConfig.allowedSourceRepo) {
    console.log(`[BENCHMARK] ❌ Benchmark command used in wrong repository`);
    console.log(`[BENCHMARK] 📍 Expected: ${org}/${benchmarkConfig.allowedSourceRepo}`);
    console.log(`[BENCHMARK] 📍 Got: ${org}/${repoName}`);
    return {
      success: false,
      errorMessage: `Benchmark command is only available in ${org}/${benchmarkConfig.allowedSourceRepo} repository`,
      isAuthorized: false,
      isBenchmarkAttempt: true,
    };
  }

  // Parse the comment
  console.log(`[BENCHMARK] 🧩 Parsing comment...`);
  const parseResult = BenchmarkParser.parseComment(commentBody);
  console.log(`[BENCHMARK] 📊 Parse result:`, { success: parseResult.success, error: parseResult.error });

  if (!parseResult.success) {
    // Only return error for actual benchmark attempts
    if (
      parseResult.error !== "Comment does not mention the bot" &&
      parseResult.error !== "Comment does not contain a benchmark command"
    ) {
      console.log(`[BENCHMARK] ❌ Invalid benchmark command: ${parseResult.error}`);

      // Still check authorization for invalid benchmark commands
      console.log(`[BENCHMARK] 🔐 Checking authorization for invalid benchmark command from @${author}...`);
      const authResult = await checkAuthorization(octokit, author, org, team);
      console.log(`[BENCHMARK] 🔓 Authorization result:`, {
        isAuthorized: authResult.isAuthorized,
        reason: authResult.reason
      });

      return {
        success: false,
        errorMessage: `Invalid benchmark command: ${parseResult.error}`,
        isAuthorized: authResult.isAuthorized,
        isBenchmarkAttempt: true,
      };
    }
    console.log(`[BENCHMARK] 🚫 Not a benchmark command, silent fail: ${parseResult.error}`);
    return { success: false, isAuthorized: false, isBenchmarkAttempt: false }; // Silent fail for non-benchmark comments
  }

  const benchmarkCommand = parseResult.benchmarkCommand!;
  console.log(`[BENCHMARK] ✅ Successfully parsed benchmark command`);

  // Check authorization
  console.log(`[BENCHMARK] 🔐 Checking authorization for @${author} in ${org}/${team}...`);
  const authResult = await checkAuthorization(octokit, author, org, team);
  console.log(`[BENCHMARK] 🔓 Authorization result:`, {
    isAuthorized: authResult.isAuthorized,
    reason: authResult.reason
  });

  if (!authResult.isAuthorized) {
    console.log(`[BENCHMARK] ❌ Authorization failed: ${authResult.reason}`);
    return {
      success: false,
      benchmarkCommand,
      errorMessage: `Authorization failed: ${authResult.reason}`,
      isAuthorized: false,
      isBenchmarkAttempt: true,
    };
  }

  console.log(`[BENCHMARK] ✅ User @${author} is authorized to trigger benchmarks`);
  console.log(`[BENCHMARK] 🎉 Benchmark processing successful! Ready to trigger workflow`);

  return {
    success: true,
    benchmarkCommand,
    authorizedUser: author,
    isAuthorized: true,
    isBenchmarkAttempt: true,
  };
}

/**
 * Trigger the benchmark workflow on the target repository
 */
export async function triggerBenchmarkWorkflow(
  octokit: GitHubApi,
  org: string,
  prNumber: number,
  benchmarkConfig: BenchmarkConfig,
): Promise<{ success: boolean; error?: string }> {
  console.log(`[BENCHMARK] 🚀 Triggering benchmark workflow...`);
  console.log(`[BENCHMARK] 📍 Target repo: ${org}/${benchmarkConfig.targetRepo}`);
  console.log(`[BENCHMARK] 📄 Workflow file: ${benchmarkConfig.workflowFile}`);
  console.log(`[BENCHMARK] 🔢 PR number: ${prNumber}`);

  try {
    await octokit.actions.createWorkflowDispatch({
      owner: org,
      repo: benchmarkConfig.targetRepo,
      workflow_id: benchmarkConfig.workflowFile,
      ref: 'main',
      inputs: {
        pr_number: prNumber.toString(),
      },
    });

    console.log(`[BENCHMARK] ✅ Workflow triggered successfully`);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.log(`[BENCHMARK] ❌ Failed to trigger workflow: ${errorMessage}`);
    return {
      success: false,
      error: `Failed to trigger benchmark workflow: ${errorMessage}`,
    };
  }
}
