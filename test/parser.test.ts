import { describe, it, expect } from "vitest";
import { CommentParser } from "../src/parser.js";

describe("CommentParser", () => {
  describe("parseComment", () => {
    it("should parse valid tip command with comment", () => {
      const comment =
        "@fluffylabs-bot tip 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY 10.5 DOT great work on the PR!";
      const result = CommentParser.parseComment(comment);

      expect(result.success).toBe(true);
      expect(result.tipCommand).toEqual({
        recipientAddress: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
        amount: 10.5,
        asset: "DOT",
        comment: "great work on the PR!",
        rawComment: comment,
      });
    });

    it("should parse valid tip command without comment", () => {
      const comment =
        "@fluffylabs-bot tip 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY 25 USDC";
      const result = CommentParser.parseComment(comment);

      expect(result.success).toBe(true);
      expect(result.tipCommand).toEqual({
        recipientAddress: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
        amount: 25,
        asset: "USDC",
        comment: undefined,
        rawComment: comment,
      });
    });

    it("should handle case insensitive asset names", () => {
      const comment =
        "@fluffylabs-bot tip 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY 5 dot";
      const result = CommentParser.parseComment(comment);

      expect(result.success).toBe(true);
      expect(result.tipCommand?.asset).toBe("DOT");
    });

    it("should handle extra whitespace", () => {
      const comment =
        "  @fluffylabs-bot    tip   5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY   1.23   USDC   nice   job  ";
      const result = CommentParser.parseComment(comment);

      expect(result.success).toBe(true);
      expect(result.tipCommand?.amount).toBe(1.23);
      expect(result.tipCommand?.comment).toBe("nice job");
    });

    it("should fail when bot is not mentioned", () => {
      const comment =
        "tip 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY 10 DOT";
      const result = CommentParser.parseComment(comment);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Comment does not mention the bot");
    });

    it("should fail when no tip command after bot mention", () => {
      const comment = "@fluffylabs-bot hello there";
      const result = CommentParser.parseComment(comment);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Comment does not contain a tip command");
    });

    it("should fail when tip command is incomplete", () => {
      const comment = "@fluffylabs-bot tip";
      const result = CommentParser.parseComment(comment);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Incomplete tip command");
    });

    it("should fail when missing required parameters", () => {
      const comment =
        "@fluffylabs-bot tip 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";
      const result = CommentParser.parseComment(comment);

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        "Tip command requires at least: address, amount, and asset",
      );
    });

    it("should fail with invalid address format", () => {
      const comment = "@fluffylabs-bot tip invalid-address 10 DOT";
      const result = CommentParser.parseComment(comment);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid Asset Hub address format");
    });

    it("should fail with invalid amount - negative", () => {
      const comment =
        "@fluffylabs-bot tip 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY -10 DOT";
      const result = CommentParser.parseComment(comment);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Amount must be a positive number");
    });

    it("should fail with invalid amount - zero", () => {
      const comment =
        "@fluffylabs-bot tip 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY 0 DOT";
      const result = CommentParser.parseComment(comment);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Amount must be a positive number");
    });

    it("should fail with invalid amount - non-numeric", () => {
      const comment =
        "@fluffylabs-bot tip 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY abc DOT";
      const result = CommentParser.parseComment(comment);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Amount must be a positive number");
    });

    it("should fail with unsupported asset", () => {
      const comment =
        "@fluffylabs-bot tip 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY 10 BTC";
      const result = CommentParser.parseComment(comment);

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        "Unsupported asset. Supported assets: DOT, USDC",
      );
    });

    it("should parse decimal amounts correctly", () => {
      const comment =
        "@fluffylabs-bot tip 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY 0.001 DOT";
      const result = CommentParser.parseComment(comment);

      expect(result.success).toBe(true);
      expect(result.tipCommand?.amount).toBe(0.001);
    });

    it("should handle bot mention in middle of comment", () => {
      const comment =
        "Thanks for the review! @fluffylabs-bot tip 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY 5 DOT keep it up";
      const result = CommentParser.parseComment(comment);

      expect(result.success).toBe(true);
      expect(result.tipCommand?.comment).toBe("keep it up");
    });
  });

  describe("containsBotMention", () => {
    it("should return true when bot is mentioned", () => {
      const comment = "Hello @fluffylabs-bot how are you?";
      expect(CommentParser.containsBotMention(comment)).toBe(true);
    });

    it("should return false when bot is not mentioned", () => {
      const comment = "Hello world!";
      expect(CommentParser.containsBotMention(comment)).toBe(false);
    });
  });

  describe("parseMultipleTips", () => {
    it("should parse multiple tip commands from multiline comment", () => {
      const comment = `Great work everyone!
      @fluffylabs-bot tip 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY 10 DOT for Alice
      @fluffylabs-bot tip 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY 5 USDC for Bob`;

      const results = CommentParser.parseMultipleTips(comment);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[0].tipCommand?.amount).toBe(10);
      expect(results[0].tipCommand?.asset).toBe("DOT");
      expect(results[1].success).toBe(true);
      expect(results[1].tipCommand?.amount).toBe(5);
      expect(results[1].tipCommand?.asset).toBe("USDC");
    });

    it("should return empty array when no valid tips found", () => {
      const comment = `Just a regular comment
      No tips here
      Move along`;

      const results = CommentParser.parseMultipleTips(comment);
      expect(results).toHaveLength(0);
    });
  });
});
