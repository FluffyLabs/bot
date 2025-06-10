import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GitHubApi } from '../../src/types.js';
import { checkMembership, checkOrgMembership, checkTeamMembership } from '../../src/tipping/membership.js';

describe('Membership', () => {
  let mockOctokit: GitHubApi;

  beforeEach(() => {
    mockOctokit = {
      rest: {
        teams: {
          getByName: vi.fn(),
          getMembershipForUserInOrg: vi.fn(),
        },
        orgs: {
          getMembershipForUser: vi.fn(),
        },
      },
    } as unknown as GitHubApi;
  });

  describe('checkTeamMembership', () => {
    it('should return true for active team member', async () => {
      (mockOctokit.rest.teams.getByName as any).mockResolvedValue({
        data: { slug: 'core-team' }
      });
      (mockOctokit.rest.teams.getMembershipForUserInOrg as any).mockResolvedValue({
        data: { state: 'active' }
      });

      const result = await checkTeamMembership(mockOctokit, 'fluffylabs', 'core-team', 'alice');

      expect(result.isMember).toBe(true);
      expect(result.state).toBe('active');
      expect(result.error).toBeUndefined();
    });

    it('should return false for non-team member', async () => {
      (mockOctokit.rest.teams.getByName as any).mockResolvedValue({
        data: { slug: 'core-team' }
      });
      (mockOctokit.rest.teams.getMembershipForUserInOrg as any).mockRejectedValue({
        status: 404
      });

      const result = await checkTeamMembership(mockOctokit, 'fluffylabs', 'core-team', 'bob');

      expect(result.isMember).toBe(false);
      expect(result.error).toBeUndefined();
    });

    it('should return false with error for API failures', async () => {
      (mockOctokit.rest.teams.getByName as any).mockRejectedValue({
        status: 403,
        message: 'Forbidden'
      });

      const result = await checkTeamMembership(mockOctokit, 'fluffylabs', 'core-team', 'alice');

      expect(result.isMember).toBe(false);
      expect(result.error).toContain('Failed to check team membership');
    });
  });

  describe('checkOrgMembership', () => {
    it('should return true for active org member', async () => {
      (mockOctokit.rest.orgs.getMembershipForUser as any).mockResolvedValue({
        data: { state: 'active' }
      });

      const result = await checkOrgMembership(mockOctokit, 'fluffylabs', 'alice');

      expect(result.isMember).toBe(true);
      expect(result.state).toBe('active');
    });

    it('should return false for non-org member', async () => {
      (mockOctokit.rest.orgs.getMembershipForUser as any).mockRejectedValue({
        status: 404
      });

      const result = await checkOrgMembership(mockOctokit, 'fluffylabs', 'bob');

      expect(result.isMember).toBe(false);
    });
  });

  describe('checkMembership', () => {
    it('should return team membership when available', async () => {
      (mockOctokit.rest.teams.getByName as any).mockResolvedValue({
        data: { slug: 'core-team' }
      });
      (mockOctokit.rest.teams.getMembershipForUserInOrg as any).mockResolvedValue({
        data: { state: 'active' }
      });

      const result = await checkMembership(mockOctokit, 'fluffylabs', 'core-team', 'alice');

      expect(result.isMember).toBe(true);
      expect(result.state).toBe('active');
      expect(result.error).toBeUndefined();
    });

    it('should fallback to org membership when team fails', async () => {
      (mockOctokit.rest.teams.getByName as any).mockRejectedValue({
        status: 404
      });
      (mockOctokit.rest.orgs.getMembershipForUser as any).mockResolvedValue({
        data: { state: 'active' }
      });

      const result = await checkMembership(mockOctokit, 'fluffylabs', 'core-team', 'alice');

      expect(result.isMember).toBe(true);
      expect(result.state).toBe('active');
      expect(result.error).toContain('Warning: Could not verify team membership');
    });

    it('should return false when both team and org fail', async () => {
      (mockOctokit.rest.teams.getByName as any).mockRejectedValue({
        status: 404
      });
      (mockOctokit.rest.orgs.getMembershipForUser as any).mockRejectedValue({
        status: 404
      });

      const result = await checkMembership(mockOctokit, 'fluffylabs', 'core-team', 'notamember');

      expect(result.isMember).toBe(false);
      expect(result.error).toContain('Failed to check team membership');
    });
  });
});
