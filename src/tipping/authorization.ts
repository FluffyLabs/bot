import { AuthorizationResult, GitHubApi } from "../types.js";
import { checkMembership } from "./membership.js";

/**
 * Check if a user is authorized to send tips
 */
export async function checkAuthorization(
  octokit: GitHubApi,
  username: string,
  org: string,
  team: string,
): Promise<AuthorizationResult> {
  try {
    const membershipResult = await checkMembership(
      octokit,
      org,
      team,
      username,
    );

    if (membershipResult.isMember) {
      return {
        isAuthorized: true,
        membershipDetails: membershipResult,
      };
    }

    // Determine reason for failure
    let reason = `User '${username}' is not a member of team '${team}' in organization '${org}'`;

    if (membershipResult.error) {
      reason = membershipResult.error;
    } else if (membershipResult.state === "pending") {
      reason = `User '${username}' has a pending invitation to team '${team}'`;
    }

    return {
      isAuthorized: false,
      reason,
      membershipDetails: membershipResult,
    };
  } catch (error) {
    return {
      isAuthorized: false,
      reason: `Failed to check authorization: ${error instanceof Error ? error.message : "Unknown error"}`,
      membershipDetails: {
        isMember: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
    };
  }
}

/**
 * Simple boolean check if user can tip
 */
export async function canUserTip(
  octokit: GitHubApi,
  username: string,
  org: string,
  team: string,
): Promise<boolean> {
  const result = await checkAuthorization(octokit, username, org, team);
  return result.isAuthorized;
}
