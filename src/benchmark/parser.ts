import type { BenchmarkCommand, BenchmarkParseResult } from './types.js';

export class BenchmarkParser {
  private static readonly BOT_MENTION = '@fluffylabs-bot';
  private static readonly BENCHMARK_COMMAND = 'benchmark';

  static parseComment(commentBody: string): BenchmarkParseResult {
    console.log(`[BENCHMARK_PARSER] 🧩 Starting comment parsing...`);
    console.log(`[BENCHMARK_PARSER] 📝 Raw comment: "${commentBody}"`);

    try {
      // Normalize whitespace and trim
      const normalizedComment = commentBody.trim().replace(/\s+/g, ' ');
      console.log(`[BENCHMARK_PARSER] 🔧 Normalized comment: "${normalizedComment}"`);

      // Check if comment mentions the bot
      console.log(`[BENCHMARK_PARSER] 👀 Checking for bot mention: ${this.BOT_MENTION}`);
      if (!normalizedComment.includes(this.BOT_MENTION)) {
        console.log(`[BENCHMARK_PARSER] ❌ Bot mention not found`);
        return {
          success: false,
          error: 'Comment does not mention the bot'
        };
      }
      console.log(`[BENCHMARK_PARSER] ✅ Bot mention found`);

      // Find the benchmark command after bot mention
      const botMentionIndex = normalizedComment.indexOf(this.BOT_MENTION);
      const afterBotMention = normalizedComment.substring(botMentionIndex + this.BOT_MENTION.length).trim();
      console.log(`[BENCHMARK_PARSER] 🔍 Text after bot mention: "${afterBotMention}"`);

      // Check if it contains benchmark command
      console.log(`[BENCHMARK_PARSER] 🎯 Checking for benchmark command: ${this.BENCHMARK_COMMAND}`);
      if (!afterBotMention.toLowerCase().startsWith(this.BENCHMARK_COMMAND)) {
        console.log(`[BENCHMARK_PARSER] ❌ Benchmark command not found`);
        return {
          success: false,
          error: 'Comment does not contain a benchmark command'
        };
      }
      console.log(`[BENCHMARK_PARSER] ✅ Benchmark command found`);

      const benchmarkCommand: BenchmarkCommand = {
        rawComment: normalizedComment
      };

      console.log(`[BENCHMARK_PARSER] 🎉 Parsing successful!`);

      return {
        success: true,
        benchmarkCommand
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log(`[BENCHMARK_PARSER] 💥 Parsing failed with exception: ${errorMessage}`);
      return {
        success: false,
        error: `Failed to parse comment: ${errorMessage}`
      };
    }
  }

  // Utility method to check if a comment contains benchmark command
  static containsBenchmarkCommand(commentBody: string): boolean {
    const normalizedComment = commentBody.trim().replace(/\s+/g, ' ');
    const hasMention = normalizedComment.includes(this.BOT_MENTION);

    if (!hasMention) {
      return false;
    }

    const botMentionIndex = normalizedComment.indexOf(this.BOT_MENTION);
    const afterBotMention = normalizedComment.substring(botMentionIndex + this.BOT_MENTION.length).trim();

    return afterBotMention.toLowerCase().startsWith(this.BENCHMARK_COMMAND);
  }
}
