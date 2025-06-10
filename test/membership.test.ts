import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkTeamMembership, checkOrgMembership, checkMembership } from '../src/membership.js';

describe('Membership', () => {
  let mockOctokit: any;

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
    };
  });

  describe('checkTeamMembership', () => {
    it('should return true for active team member', async () => {
      mockOctokit.rest.teams.getByName.mockResolvedValue({
        data: { slug: 'core-team' }
      });
      mockOctokit.rest.teams.getMembershipForUserInOrg.mockResolvedValue({
        data: { state: 'active' }
      });

      const result = await checkTeamMembership(mockOctokit, 'fluffylabs', 'core-team', 'alice');

      expect(result.isMember).toBe(true);
      expect(result.state).toBe('active');
      expect(result.error).toBeUndefined();
    });

    it('should return false for non-team member', async () => {
      mockOctokit.rest.teams.getByName.mockResolvedValue({
        data: { slug: 'core-team' }
      });
      mockOctokit.rest.teams.getMembershipForUserInOrg.mockRejectedValue({
        status: 404
      });

      const result = await checkTeamMembership(mockOctokit, 'fluffylabs', 'core-team', 'bob');

      expect(result.isMember).toBe(false);
      expect(result.error).toBeUndefined();
    });

    it('should return false with error for API failures', async () => {
      mockOctokit.rest.teams.getByName.mockRejectedValue({
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
      mockOctokit.rest.orgs.getMembershipForUser.mockResolvedValue({
        data: { state: 'active' }
      });

      const result = await checkOrgMembership(mockOctokit, 'fluffylabs', 'alice');

      expect(result.isMember).toBe(true);
      expect(result.state).toBe('active');
    });

    it('should return false for non-org member', async () => {
      mockOctokit.rest.orgs.getMembershipForUser.mockRejectedValue({
        status: 404
      });

      const result = await checkOrgMembership(mockOctokit, 'fluffylabs', 'bob');

      expect(result.isMember).toBe(false);
    });
  });

  describe('checkMembership', () => {
    it('should return team membership when available', async () => {
      mockOctokit.rest.teams.getByName.mockResolvedValue({
        data: { slug: 'core-team' }
      });
      mockOctokit.rest.teams.getMembershipForUserInOrg.mockResolvedValue({
        data: { state: 'active' }
      });

      const result = await checkMembership(mockOctokit, 'fluffylabs', 'core-team', 'alice');

      expect(result.isMember).toBe(true);
      expect(result.state).toBe('active');
      expect(result.error).toBeUndefined();
    });

    it('should fallback to org membership when team check fails', async () => {
      mockOctokit.rest.teams.getByName.mockRejectedValue({
        status: 403,
        message: 'Forbidden'
      });
      mockOctokit.rest.orgs.getMembershipForUser.mockResolvedValue({
        data: { state: 'active' }
      });

      const result = await checkMembership(mockOctokit, 'fluffylabs', 'core-team', 'alice');

      expect(result.isMember).toBe(true);
      expect(result.state).toBe('active');
      expect(result.error).toContain('Warning: Could not verify team membership');
    });

    it('should return team error when both checks fail', async () => {
      mockOctokit.rest.teams.getByName.mockRejectedValue({
        status: 403,
        message: 'Forbidden'
      });
      mockOctokit.rest.orgs.getMembershipForUser.mockRejectedValue({
        status: 404
      });

      const result = await checkMembership(mockOctokit, 'fluffylabs', 'core-team', 'notamember');

      expect(result.isMember).toBe(false);
      expect(result.error).toContain('Failed to check team membership');
    });
  });
});