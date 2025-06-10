import { getConfig } from './config.js';
import { checkMembership, MembershipResult } from './membership.js';

export interface AuthorizationResult {
  isAuthorized: boolean;
  reason?: string;
  membershipDetails?: MembershipResult;
}

/**
 * Check if a user is authorized to send tips
 */
export async function checkAuthorization(
  octokit: any,
  username: string,
  org?: string,
  team?: string
): Promise<AuthorizationResult> {
  try {
    const config = getConfig();
    const finalOrg = org || config.github.org;
    const finalTeam = team || config.github.team;

    const membershipResult = await checkMembership(octokit, finalOrg, finalTeam, username);

    if (membershipResult.isMember) {
      return {
        isAuthorized: true,
        membershipDetails: membershipResult
      };
    }

    // Determine reason for failure
    let reason = `User '${username}' is not a member of team '${finalTeam}' in organization '${finalOrg}'`;
    
    if (membershipResult.error) {
      reason = membershipResult.error;
    } else if (membershipResult.state === 'pending') {
      reason = `User '${username}' has a pending invitation to team '${finalTeam}'`;
    }

    return {
      isAuthorized: false,
      reason,
      membershipDetails: membershipResult
    };

  } catch (error) {
    return {
      isAuthorized: false,
      reason: `Failed to check authorization: ${error instanceof Error ? error.message : 'Unknown error'}`,
      membershipDetails: {
        isMember: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

/**
 * Simple boolean check if user can tip
 */
export async function canUserTip(
  octokit: any,
  username: string,
  org?: string,
  team?: string
): Promise<boolean> {
  const result = await checkAuthorization(octokit, username, org, team);
  return result.isAuthorized;
}