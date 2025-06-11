import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GitHubApi } from '../../src/types.js';
import { canUserTip, checkAuthorization } from '../../src/tipping/authorization.js';

describe('Authorization', () => {
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

  describe('checkAuthorization', () => {
    it('should authorize active team member', async () => {
      (mockOctokit.rest.teams.getByName as any).mockResolvedValue({
        data: { slug: 'core-team' }
      });
      (mockOctokit.rest.teams.getMembershipForUserInOrg as any).mockResolvedValue({
        data: { state: 'active' }
      });

      const result = await checkAuthorization(mockOctokit, 'alice', 'fluffylabs', 'core-team');

      expect(result.isAuthorized).toBe(true);
      expect(result.reason).toBeUndefined();
      expect(result.membershipDetails?.isMember).toBe(true);
    });

    it('should not authorize non-team member', async () => {
      (mockOctokit.rest.teams.getByName as any).mockResolvedValue({
        data: { slug: 'core-team' }
      });
      (mockOctokit.rest.teams.getMembershipForUserInOrg as any).mockRejectedValue({
        status: 404
      });

      const result = await checkAuthorization(mockOctokit, 'bob', 'fluffylabs', 'core-team');

      expect(result.isAuthorized).toBe(false);
      expect(result.reason).toContain("not a member of team 'core-team'");
    });

    it('should not authorize pending team member', async () => {
      (mockOctokit.rest.teams.getByName as any).mockResolvedValue({
        data: { slug: 'core-team' }
      });
      (mockOctokit.rest.teams.getMembershipForUserInOrg as any).mockResolvedValue({
        data: { state: 'pending' }
      });

      const result = await checkAuthorization(mockOctokit, 'charlie', 'fluffylabs', 'core-team');

      expect(result.isAuthorized).toBe(false);
      expect(result.reason).toContain('pending invitation');
    });

    it('should authorize with org fallback when team check fails', async () => {
      (mockOctokit.rest.teams.getByName as any).mockRejectedValue({
        status: 404
      });
      (mockOctokit.rest.orgs.getMembershipForUser as any).mockResolvedValue({
        data: { state: 'active' }
      });

      const result = await checkAuthorization(mockOctokit, 'alice', 'fluffylabs', 'core-team');

      expect(result.isAuthorized).toBe(true);
      expect(result.membershipDetails?.error).toContain('Warning');
    });

    it('should use custom org and team when provided', async () => {
      (mockOctokit.rest.teams.getByName as any).mockResolvedValue({
        data: { slug: 'core-team' }
      });
      (mockOctokit.rest.teams.getMembershipForUserInOrg as any).mockResolvedValue({
        data: { state: 'active' }
      });

      const result = await checkAuthorization(mockOctokit, 'alice', 'custom-org', 'custom-team');

      expect(result.isAuthorized).toBe(true);
      expect(mockOctokit.rest.teams.getByName).toHaveBeenCalledWith({
        org: 'custom-org',
        team_slug: 'custom-team'
      });
    });
  });

  describe('canUserTip', () => {
    it('should return true for authorized user', async () => {
      (mockOctokit.rest.teams.getByName as any).mockResolvedValue({
        data: { slug: 'core-team' }
      });
      (mockOctokit.rest.teams.getMembershipForUserInOrg as any).mockResolvedValue({
        data: { state: 'active' }
      });

      const result = await canUserTip(mockOctokit, 'alice', 'fluffylabs', 'core-team');

      expect(result).toBe(true);
    });

    it('should return false for unauthorized user', async () => {
      (mockOctokit.rest.teams.getByName as any).mockResolvedValue({
        data: { slug: 'core-team' }
      });
      (mockOctokit.rest.teams.getMembershipForUserInOrg as any).mockRejectedValue({
        status: 404
      });

      const result = await canUserTip(mockOctokit, 'bob', 'fluffylabs', 'core-team');

      expect(result).toBe(false);
    });
  });
});
