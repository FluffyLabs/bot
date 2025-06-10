import type { GitHubApi, MembershipResult, MembershipState, GitHubApiError } from './types.js';

/**
 * Check if a user is a member of a specific team in an organization
 */
export async function checkTeamMembership(
  octokit: GitHubApi,
  org: string,
  team: string,
  username: string
): Promise<MembershipResult> {
  try {
    // Get team info
    const teamResponse = await octokit.rest.teams.getByName({
      org,
      team_slug: team,
    });

    try {
      // Check membership
      const membershipResponse = await octokit.rest.teams.getMembershipForUserInOrg({
        org,
        team_slug: teamResponse.data.slug,
        username,
      });

      return {
        isMember: membershipResponse.data.state === 'active',
        state: membershipResponse.data.state as MembershipState
      };

    } catch (membershipError: unknown) {
      const apiError = membershipError as GitHubApiError;
      if (apiError.status === 404) {
        // User is not a member of the team (normal case, not an error)
        return { isMember: false };
      }
      
      return {
        isMember: false,
        error: `Failed to check team membership: ${apiError.message || 'Unknown error'}`
      };
    }

  } catch (error: unknown) {
    const apiError = error as GitHubApiError;
    return {
      isMember: false,
      error: `Failed to check team membership: ${apiError.message || 'Unknown error'}`
    };
  }
}

/**
 * Check if a user is a member of an organization (fallback)
 */
export async function checkOrgMembership(
  octokit: GitHubApi,
  org: string,
  username: string
): Promise<MembershipResult> {
  try {
    const membershipResponse = await octokit.rest.orgs.getMembershipForUser({
      org,
      username,
    });

    return {
      isMember: membershipResponse.data.state === 'active',
      state: membershipResponse.data.state as MembershipState
    };

  } catch (error: unknown) {
    const apiError = error as GitHubApiError;
    if (apiError.status === 404) {
      return { isMember: false };
    }

    return {
      isMember: false,
      error: `Failed to check organization membership: ${apiError.message || 'Unknown error'}`
    };
  }
}

/**
 * Check membership with team-first approach and org fallback
 */
export async function checkMembership(
  octokit: GitHubApi,
  org: string,
  team: string,
  username: string
): Promise<MembershipResult> {
  const teamResult = await checkTeamMembership(octokit, org, team, username);
  
  // If team check succeeded and user is a member, return the result
  if (teamResult.isMember) {
    return teamResult;
  }

  // Try org membership as fallback (either team failed or user is not a team member)
  const orgResult = await checkOrgMembership(octokit, org, username);
  
  if (orgResult.isMember) {
    return {
      ...orgResult,
      error: `Warning: Could not verify team membership, but user is an organization member`
    };
  }

  // If both failed, prefer team error if available
  return teamResult;
}