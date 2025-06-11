import {
  GitHubApi,
  GitHubApiError,
  MembershipResult,
  MembershipState,
} from "../types.js";

/**
 * Check if a user is a member of a specific team in an organization
 */
export async function checkTeamMembership(
  octokit: GitHubApi,
  org: string,
  team: string,
  username: string,
): Promise<MembershipResult> {
  console.log(`[MEMBERSHIP] 👥 Checking team membership for @${username} in ${org}/${team}`);
  
  try {
    // Get team info
    console.log(`[MEMBERSHIP] 🔍 Getting team info for ${org}/${team}...`);
    const teamResponse = await octokit.rest.teams.getByName({
      org,
      team_slug: team,
    });
    console.log(`[MEMBERSHIP] ✅ Team found: ${teamResponse.data.slug}`);

    try {
      // Check membership
      console.log(`[MEMBERSHIP] 🔍 Checking membership for @${username} in team ${teamResponse.data.slug}...`);
      const membershipResponse =
        await octokit.rest.teams.getMembershipForUserInOrg({
          org,
          team_slug: teamResponse.data.slug,
          username,
        });

      console.log(`[MEMBERSHIP] 📊 Team membership state: ${membershipResponse.data.state}`);
      const isActiveMember = membershipResponse.data.state === "active";
      console.log(`[MEMBERSHIP] ${isActiveMember ? '✅' : '⏳'} Team membership result: ${isActiveMember ? 'ACTIVE MEMBER' : membershipResponse.data.state.toUpperCase()}`);

      return {
        isMember: isActiveMember,
        state: membershipResponse.data.state as MembershipState,
      };
    } catch (membershipError: unknown) {
      const apiError = membershipError as GitHubApiError;
      if (apiError.status === 404) {
        // User is not a member of the team (normal case, not an error)
        console.log(`[MEMBERSHIP] ❌ User @${username} is not a member of team ${team} (404)`);
        return { isMember: false };
      }
      
      console.log(`[MEMBERSHIP] 💥 Team membership check failed: ${apiError.message}`);
      return {
        isMember: false,
        error: `Failed to check team membership: ${apiError.message || "Unknown error"}`,
      };
    }
  } catch (error: unknown) {
    const apiError = error as GitHubApiError;
    console.log(`[MEMBERSHIP] 💥 Team lookup failed: ${apiError.message}`);
    return {
      isMember: false,
      error: `Failed to check team membership: ${apiError.message || "Unknown error"}`,
    };
  }
}

/**
 * Check if a user is a member of an organization (fallback)
 */
export async function checkOrgMembership(
  octokit: GitHubApi,
  org: string,
  username: string,
): Promise<MembershipResult> {
  console.log(`[MEMBERSHIP] 🏢 Checking organization membership for @${username} in ${org}`);
  
  try {
    console.log(`[MEMBERSHIP] 🔍 Getting organization membership...`);
    const membershipResponse = await octokit.rest.orgs.getMembershipForUser({
      org,
      username,
    });

    console.log(`[MEMBERSHIP] 📊 Organization membership state: ${membershipResponse.data.state}`);
    const isActiveMember = membershipResponse.data.state === "active";
    console.log(`[MEMBERSHIP] ${isActiveMember ? '✅' : '⏳'} Organization membership result: ${isActiveMember ? 'ACTIVE MEMBER' : membershipResponse.data.state.toUpperCase()}`);

    return {
      isMember: isActiveMember,
      state: membershipResponse.data.state as MembershipState,
    };
  } catch (error: unknown) {
    const apiError = error as GitHubApiError;
    if (apiError.status === 404) {
      console.log(`[MEMBERSHIP] ❌ User @${username} is not a member of organization ${org} (404)`);
      return { isMember: false };
    }

    console.log(`[MEMBERSHIP] 💥 Organization membership check failed: ${apiError.message}`);
    return {
      isMember: false,
      error: `Failed to check organization membership: ${apiError.message || "Unknown error"}`,
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
  username: string,
): Promise<MembershipResult> {
  console.log(`[MEMBERSHIP] 🎯 Starting comprehensive membership check for @${username}`);
  console.log(`[MEMBERSHIP] 📋 Strategy: Team first (${org}/${team}), then organization fallback (${org})`);
  
  const teamResult = await checkTeamMembership(octokit, org, team, username);

  // If team check succeeded and user is a member, return the result
  if (teamResult.isMember) {
    console.log(`[MEMBERSHIP] ✅ Membership check complete: User is team member`);
    return teamResult;
  }

  console.log(`[MEMBERSHIP] 🔄 Team membership failed/not found, trying organization fallback...`);
  
  // Try org membership as fallback (either team failed or user is not a team member)
  const orgResult = await checkOrgMembership(octokit, org, username);

  if (orgResult.isMember) {
    console.log(`[MEMBERSHIP] ⚠️ Membership check complete: User is organization member (team check failed)`);
    return {
      ...orgResult,
      error: `Warning: Could not verify team membership, but user is an organization member`,
    };
  }

  console.log(`[MEMBERSHIP] ❌ Membership check complete: User is neither team nor organization member`);
  
  // If both failed, prefer team error if available
  return teamResult;
}
