import { AuthorizationResult, GitHubApi } from "../types.js";
import { checkMembership } from "./membership.js";

/**
 * Check if a user is authorized to perform actions
 */
export async function checkAuthorization(
  octokit: GitHubApi,
  username: string,
  org: string,
  team: string,
): Promise<AuthorizationResult> {
  console.log(`[AUTH] 🔐 Checking authorization for @${username} in ${org}/${team}`);

  try {
    console.log(`[AUTH] 👥 Checking membership...`);
    const membershipResult = await checkMembership(
      octokit,
      org,
      team,
      username,
    );
    console.log(`[AUTH] 📊 Membership check result: isMember=${membershipResult.isMember}, state=${membershipResult.state}, error=${membershipResult.error}`);

    if (membershipResult.isMember) {
      console.log(`[AUTH] ✅ User @${username} is authorized (active member)`);
      return {
        isAuthorized: true,
        membershipDetails: membershipResult,
      };
    }

    // Determine reason for failure
    let reason = `User '${username}' is not a member of team '${team}' in organization '${org}'`;

    if (membershipResult.error) {
      reason = membershipResult.error;
      console.log(`[AUTH] ❌ Authorization failed due to error: ${reason}`);
    } else if (membershipResult.state === "pending") {
      reason = `User '${username}' has a pending invitation to team '${team}'`;
      console.log(`[AUTH] ⏳ Authorization failed - pending invitation: ${reason}`);
    } else {
      console.log(`[AUTH] ❌ Authorization failed - not a member: ${reason}`);
    }

    return {
      isAuthorized: false,
      reason,
      membershipDetails: membershipResult,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.log(`[AUTH] 💥 Authorization check threw error: ${errorMessage}`);
    return {
      isAuthorized: false,
      reason: `Failed to check authorization: ${errorMessage}`,
      membershipDetails: {
        isMember: false,
        error: errorMessage,
      },
    };
  }
}

/**
 * Simple boolean check if user is authorized
 */
export async function canUserTip(
  octokit: GitHubApi,
  username: string,
  org: string,
  team: string,
): Promise<boolean> {
  console.log(`[AUTH] 🤔 Simple authorization check for @${username}`);
  const result = await checkAuthorization(octokit, username, org, team);
  console.log(`[AUTH] 🎯 Simple authorization result: ${result.isAuthorized ? 'AUTHORIZED' : 'NOT AUTHORIZED'}`);
  return result.isAuthorized;
}
