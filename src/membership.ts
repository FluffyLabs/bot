export interface MembershipResult {
  isMember: boolean;
  state?: 'active' | 'pending';
  error?: string;
}

/**
 * Check if a user is a member of a specific team in an organization
 */
export async function checkTeamMembership(
  octokit: any,
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

    // Check membership
    const membershipResponse = await octokit.rest.teams.getMembershipForUserInOrg({
      org,
      team_slug: teamResponse.data.slug,
      username,
    });

    return {
      isMember: membershipResponse.data.state === 'active',
      state: membershipResponse.data.state as 'active' | 'pending'
    };

  } catch (error: any) {
    if (error.status === 404) {
      return { isMember: false };
    }
    
    return {
      isMember: false,
      error: `Failed to check team membership: ${error.message || 'Unknown error'}`
    };
  }
}

/**
 * Check if a user is a member of an organization (fallback)
 */
export async function checkOrgMembership(
  octokit: any,
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
      state: membershipResponse.data.state as 'active' | 'pending'
    };

  } catch (error: any) {
    if (error.status === 404) {
      return { isMember: false };
    }

    return {
      isMember: false,
      error: `Failed to check organization membership: ${error.message || 'Unknown error'}`
    };
  }
}

/**
 * Check membership with team-first approach and org fallback
 */
export async function checkMembership(
  octokit: any,
  org: string,
  team: string,
  username: string
): Promise<MembershipResult> {
  const teamResult = await checkTeamMembership(octokit, org, team, username);
  
  // If team check succeeded (no error), return the result
  if (!teamResult.error) {
    return teamResult;
  }

  // Try org membership as fallback
  const orgResult = await checkOrgMembership(octokit, org, username);
  
  if (orgResult.isMember) {
    return {
      ...orgResult,
      error: `Warning: Could not verify team membership, but user is an organization member`
    };
  }

  return teamResult;
}