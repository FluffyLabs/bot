import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkAuthorization, canUserTip } from '../src/authorization.js';

// Mock the config module
vi.mock('../src/config.js', () => ({
  getConfig: vi.fn(() => ({
    github: {
      org: 'fluffylabs',
      team: 'core-team',
      botName: 'fluffylabs-bot'
    },
    blockchain: {
      walletSeed: 'test-seed',
      assetHubRpc: 'wss://test-rpc.example.com',
      maxDotTip: 100,
      maxUsdcTip: 1000
    }
  }))
}));

describe('Authorization', () => {
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

  describe('checkAuthorization', () => {
    it('should authorize active team member', async () => {
      mockOctokit.rest.teams.getByName.mockResolvedValue({
        data: { slug: 'core-team' }
      });
      mockOctokit.rest.teams.getMembershipForUserInOrg.mockResolvedValue({
        data: { state: 'active' }
      });

      const result = await checkAuthorization(mockOctokit, 'alice');

      expect(result.isAuthorized).toBe(true);
      expect(result.reason).toBeUndefined();
      expect(result.membershipDetails?.isMember).toBe(true);
    });

    it('should not authorize non-team member', async () => {
      mockOctokit.rest.teams.getByName.mockResolvedValue({
        data: { slug: 'core-team' }
      });
      mockOctokit.rest.teams.getMembershipForUserInOrg.mockRejectedValue({
        status: 404
      });

      const result = await checkAuthorization(mockOctokit, 'bob');

      expect(result.isAuthorized).toBe(false);
      expect(result.reason).toContain("not a member of team 'core-team'");
    });

    it('should not authorize pending team member', async () => {
      mockOctokit.rest.teams.getByName.mockResolvedValue({
        data: { slug: 'core-team' }
      });
      mockOctokit.rest.teams.getMembershipForUserInOrg.mockResolvedValue({
        data: { state: 'pending' }
      });

      const result = await checkAuthorization(mockOctokit, 'charlie');

      expect(result.isAuthorized).toBe(false);
      expect(result.reason).toContain('pending invitation');
    });

    it('should authorize with org fallback when team check fails', async () => {
      mockOctokit.rest.teams.getByName.mockRejectedValue({
        status: 403,
        message: 'Forbidden'
      });
      mockOctokit.rest.orgs.getMembershipForUser.mockResolvedValue({
        data: { state: 'active' }
      });

      const result = await checkAuthorization(mockOctokit, 'alice');

      expect(result.isAuthorized).toBe(true);
      expect(result.membershipDetails?.error).toContain('Warning');
    });

    it('should use custom org and team when provided', async () => {
      mockOctokit.rest.teams.getByName.mockResolvedValue({
        data: { slug: 'custom-team' }
      });
      mockOctokit.rest.teams.getMembershipForUserInOrg.mockResolvedValue({
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
      mockOctokit.rest.teams.getByName.mockResolvedValue({
        data: { slug: 'core-team' }
      });
      mockOctokit.rest.teams.getMembershipForUserInOrg.mockResolvedValue({
        data: { state: 'active' }
      });

      const result = await canUserTip(mockOctokit, 'alice');

      expect(result).toBe(true);
    });

    it('should return false for unauthorized user', async () => {
      mockOctokit.rest.teams.getByName.mockResolvedValue({
        data: { slug: 'core-team' }
      });
      mockOctokit.rest.teams.getMembershipForUserInOrg.mockRejectedValue({
        status: 404
      });

      const result = await canUserTip(mockOctokit, 'bob');

      expect(result).toBe(false);
    });
  });
});