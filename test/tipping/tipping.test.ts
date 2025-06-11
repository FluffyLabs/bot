import { describe, it, expect, beforeEach, vi } from 'vitest';
import { processTipComment, containsBotMention } from '../../src/tipping/tipping.js';
import type { GitHubApi } from '../../src/types.js';

import { CommentParser } from '../../src/tipping/parser.js';
import { checkAuthorization } from '../../src/tipping/authorization.js';

// Mock the modules
vi.mock('../../src/tipping/parser.js', () => ({
  CommentParser: {
    parseComment: vi.fn(),
    containsBotMention: vi.fn(),
  }
}));

vi.mock('../../src/tipping/authorization.js', () => ({
  checkAuthorization: vi.fn(),
}));

describe('Tipping', () => {
  let mockOctokit: GitHubApi;

  beforeEach(() => {
    mockOctokit = {} as GitHubApi;
    vi.clearAllMocks();
  });

  describe('processTipComment', () => {
    it('should process valid tip successfully', async () => {
      // Mock successful parsing
      vi.mocked(CommentParser.parseComment).mockReturnValue({
        success: true,
        tipCommand: {
          recipientAddress: '12uGtv6u5vvUcog67hfLXqrM5anMhyoNuhtp8M1nyQtonwSK',
          amount: 10,
          asset: 'DOT',
          comment: 'great work!',
          rawComment: '@fluffylabs-bot tip 12uGtv6u5vvUcog67hfLXqrM5anMhyoNuhtp8M1nyQtonwSK 10 DOT great work!'
        }
      });

      // Mock successful authorization
      vi.mocked(checkAuthorization).mockResolvedValue({
        isAuthorized: true
      });

      const result = await processTipComment(mockOctokit, '@fluffylabs-bot tip 12uGtv6u5vvUcog67hfLXqrM5anMhyoNuhtp8M1nyQtonwSK 10 DOT great work!', 'alice', 'fluffylabs', 'core-team', 100, 1000);

      expect(result.success).toBe(true);
      expect(result.tipCommand?.amount).toBe(10);
      expect(result.authorizedUser).toBe('alice');
    });

    it('should fail for invalid comment format', async () => {
      vi.mocked(CommentParser.parseComment).mockReturnValue({
        success: false,
        error: 'Invalid Asset Hub address format'
      });

      const result = await processTipComment(mockOctokit, '@fluffylabs-bot tip invalid-address 10 DOT', 'alice', 'fluffylabs', 'core-team', 100, 1000);

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('Invalid tip command');
    });

    it('should fail for unauthorized user', async () => {
      vi.mocked(CommentParser.parseComment).mockReturnValue({
        success: true,
        tipCommand: {
          recipientAddress: '12uGtv6u5vvUcog67hfLXqrM5anMhyoNuhtp8M1nyQtonwSK',
          amount: 10,
          asset: 'DOT',
          rawComment: '@fluffylabs-bot tip 12uGtv6u5vvUcog67hfLXqrM5anMhyoNuhtp8M1nyQtonwSK 10 DOT'
        }
      });

      vi.mocked(checkAuthorization).mockResolvedValue({
        isAuthorized: false,
        reason: 'User not a member of team'
      });

      const result = await processTipComment(mockOctokit, '@fluffylabs-bot tip 12uGtv6u5vvUcog67hfLXqrM5anMhyoNuhtp8M1nyQtonwSK 10 DOT', 'bob', 'fluffylabs', 'core-team', 100, 1000);

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('Authorization failed');
    });

    it('should fail for amount exceeding limits', async () => {
      vi.mocked(CommentParser.parseComment).mockReturnValue({
        success: true,
        tipCommand: {
          recipientAddress: '12uGtv6u5vvUcog67hfLXqrM5anMhyoNuhtp8M1nyQtonwSK',
          amount: 150,
          asset: 'DOT',
          rawComment: '@fluffylabs-bot tip 12uGtv6u5vvUcog67hfLXqrM5anMhyoNuhtp8M1nyQtonwSK 150 DOT'
        }
      });

      vi.mocked(checkAuthorization).mockResolvedValue({
        isAuthorized: true
      });

      const result = await processTipComment(mockOctokit, '@fluffylabs-bot tip 12uGtv6u5vvUcog67hfLXqrM5anMhyoNuhtp8M1nyQtonwSK 150 DOT', 'alice', 'fluffylabs', 'core-team', 100, 1000);

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('exceeds maximum of 100 DOT');
    });

    it('should silently fail for non-tip comments', async () => {
      vi.mocked(CommentParser.parseComment).mockReturnValue({
        success: false,
        error: 'Comment does not mention the bot'
      });

      const result = await processTipComment(mockOctokit, 'Just a regular comment', 'alice', 'fluffylabs', 'core-team', 100, 1000);

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBeUndefined();
    });
  });

  describe('containsBotMention', () => {
    it('should return true when bot is mentioned', () => {
      vi.mocked(CommentParser.containsBotMention).mockReturnValue(true);

      const result = containsBotMention('@fluffylabs-bot hello');

      expect(result).toBe(true);
    });

    it('should return false when bot is not mentioned', () => {
      vi.mocked(CommentParser.containsBotMention).mockReturnValue(false);

      const result = containsBotMention('regular comment');

      expect(result).toBe(false);
    });
  });
});
