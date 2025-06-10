import { describe, it, expect, beforeEach, vi } from 'vitest';
import { processTipComment, containsBotMention } from '../src/tipping.js';

// Mock the modules
vi.mock('../src/parser.js', () => ({
  CommentParser: {
    parseComment: vi.fn(),
    containsBotMention: vi.fn(),
  }
}));

vi.mock('../src/authorization.js', () => ({
  checkAuthorization: vi.fn(),
}));

vi.mock('../src/config.js', () => ({
  getConfig: vi.fn(() => ({
    blockchain: {
      maxDotTip: 100,
      maxUsdcTip: 1000,
    }
  }))
}));

import { CommentParser } from '../src/parser.js';
import { checkAuthorization } from '../src/authorization.js';

describe('Tipping', () => {
  let mockOctokit: any;

  beforeEach(() => {
    mockOctokit = {};
    vi.clearAllMocks();
  });

  describe('processTipComment', () => {
    it('should process valid tip successfully', async () => {
      // Mock successful parsing
      (CommentParser.parseComment as any).mockReturnValue({
        success: true,
        tipCommand: {
          recipientAddress: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
          amount: 10,
          asset: 'DOT',
          comment: 'great work!'
        }
      });

      // Mock successful authorization
      (checkAuthorization as any).mockResolvedValue({
        isAuthorized: true
      });

      const result = await processTipComment(mockOctokit, '@fluffylabs-bot tip 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY 10 DOT great work!', 'alice');

      expect(result.success).toBe(true);
      expect(result.tipCommand?.amount).toBe(10);
      expect(result.authorizedUser).toBe('alice');
    });

    it('should fail for invalid comment format', async () => {
      (CommentParser.parseComment as any).mockReturnValue({
        success: false,
        error: 'Invalid Asset Hub address format'
      });

      const result = await processTipComment(mockOctokit, '@fluffylabs-bot tip invalid-address 10 DOT', 'alice');

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('Invalid tip command');
    });

    it('should fail for unauthorized user', async () => {
      (CommentParser.parseComment as any).mockReturnValue({
        success: true,
        tipCommand: {
          recipientAddress: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
          amount: 10,
          asset: 'DOT'
        }
      });

      (checkAuthorization as any).mockResolvedValue({
        isAuthorized: false,
        reason: 'User not a member of team'
      });

      const result = await processTipComment(mockOctokit, '@fluffylabs-bot tip 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY 10 DOT', 'bob');

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('Authorization failed');
    });

    it('should fail for amount exceeding limits', async () => {
      (CommentParser.parseComment as any).mockReturnValue({
        success: true,
        tipCommand: {
          recipientAddress: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
          amount: 150,
          asset: 'DOT'
        }
      });

      (checkAuthorization as any).mockResolvedValue({
        isAuthorized: true
      });

      const result = await processTipComment(mockOctokit, '@fluffylabs-bot tip 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY 150 DOT', 'alice');

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('exceeds maximum of 100 DOT');
    });

    it('should silently fail for non-tip comments', async () => {
      (CommentParser.parseComment as any).mockReturnValue({
        success: false,
        error: 'Comment does not mention the bot'
      });

      const result = await processTipComment(mockOctokit, 'Just a regular comment', 'alice');

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBeUndefined();
    });
  });

  describe('containsBotMention', () => {
    it('should return true when bot is mentioned', () => {
      (CommentParser.containsBotMention as any).mockReturnValue(true);

      const result = containsBotMention('@fluffylabs-bot hello');

      expect(result).toBe(true);
    });

    it('should return false when bot is not mentioned', () => {
      (CommentParser.containsBotMention as any).mockReturnValue(false);

      const result = containsBotMention('regular comment');

      expect(result).toBe(false);
    });
  });
});