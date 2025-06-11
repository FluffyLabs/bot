import type { TipCommand, ParseResult } from './types.js';

export class CommentParser {
  private static readonly BOT_MENTION = '@fluffylabs-bot';
  private static readonly TIP_COMMAND = 'tip';
  private static readonly SUPPORTED_ASSETS = ['DOT', 'USDC'] as const;
  
  // Asset Hub address validation (Polkadot SS58 format)
  private static readonly ASSET_HUB_ADDRESS_REGEX = /^[1-9A-HJ-NP-Za-km-z]{47,48}$/;

  static parseComment(commentBody: string): ParseResult {
    console.log(`[PARSER] 🧩 Starting comment parsing...`);
    console.log(`[PARSER] 📝 Raw comment: "${commentBody}"`);
    
    try {
      // Normalize whitespace and trim
      const normalizedComment = commentBody.trim().replace(/\s+/g, ' ');
      console.log(`[PARSER] 🔧 Normalized comment: "${normalizedComment}"`);
      
      // Check if comment mentions the bot
      console.log(`[PARSER] 👀 Checking for bot mention: ${this.BOT_MENTION}`);
      if (!normalizedComment.includes(this.BOT_MENTION)) {
        console.log(`[PARSER] ❌ Bot mention not found`);
        return {
          success: false,
          error: 'Comment does not mention the bot'
        };
      }
      console.log(`[PARSER] ✅ Bot mention found`);

      // Find the tip command after bot mention
      const botMentionIndex = normalizedComment.indexOf(this.BOT_MENTION);
      const afterBotMention = normalizedComment.substring(botMentionIndex + this.BOT_MENTION.length).trim();
      console.log(`[PARSER] 🔍 Text after bot mention: "${afterBotMention}"`);
      
      // Check if it starts with tip command
      console.log(`[PARSER] 💰 Checking for tip command: ${this.TIP_COMMAND}`);
      if (!afterBotMention.toLowerCase().startsWith(this.TIP_COMMAND)) {
        console.log(`[PARSER] ❌ Tip command not found`);
        return {
          success: false,
          error: 'Comment does not contain a tip command'
        };
      }
      console.log(`[PARSER] ✅ Tip command found`);

      // Extract the command part (everything after "tip")
      const commandPart = afterBotMention.substring(this.TIP_COMMAND.length).trim();
      console.log(`[PARSER] 📋 Command parameters: "${commandPart}"`);
      
      if (!commandPart) {
        console.log(`[PARSER] ❌ No parameters after tip command`);
        return {
          success: false,
          error: 'Incomplete tip command'
        };
      }

      // Split the command into parts
      const parts = commandPart.split(' ');
      console.log(`[PARSER] 🔢 Split into ${parts.length} parts:`, parts);
      
      if (parts.length < 3) {
        console.log(`[PARSER] ❌ Insufficient parameters: need at least 3, got ${parts.length}`);
        return {
          success: false,
          error: 'Tip command requires at least: address, amount, and asset'
        };
      }

      const [addressPart, amountPart, assetPart, ...commentParts] = parts;
      console.log(`[PARSER] 🏠 Address: "${addressPart}"`);
      console.log(`[PARSER] 💵 Amount: "${amountPart}"`);
      console.log(`[PARSER] 🪙 Asset: "${assetPart}"`);
      console.log(`[PARSER] 💬 Comment parts:`, commentParts);

      // Validate address
      const recipientAddress = addressPart.trim();
      console.log(`[PARSER] 🔍 Validating address: ${recipientAddress}`);
      if (!this.isValidAssetHubAddress(recipientAddress)) {
        console.log(`[PARSER] ❌ Invalid address format`);
        return {
          success: false,
          error: 'Invalid Asset Hub address format'
        };
      }
      console.log(`[PARSER] ✅ Address is valid`);

      // Validate amount
      console.log(`[PARSER] 🔢 Parsing amount: "${amountPart}"`);
      const amount = parseFloat(amountPart);
      console.log(`[PARSER] 📊 Parsed amount: ${amount}`);
      if (isNaN(amount) || amount <= 0) {
        console.log(`[PARSER] ❌ Invalid amount: ${amount}`);
        return {
          success: false,
          error: 'Amount must be a positive number'
        };
      }
      console.log(`[PARSER] ✅ Amount is valid: ${amount}`);

      // Validate asset
      const asset = assetPart.toUpperCase();
      console.log(`[PARSER] 🪙 Validating asset: "${asset}"`);
      if (!this.isSupportedAsset(asset)) {
        console.log(`[PARSER] ❌ Unsupported asset: ${asset}`);
        return {
          success: false,
          error: `Unsupported asset. Supported assets: ${this.SUPPORTED_ASSETS.join(', ')}`
        };
      }
      console.log(`[PARSER] ✅ Asset is supported: ${asset}`);

      // Extract optional comment
      const comment = commentParts.length > 0 ? commentParts.join(' ') : undefined;
      console.log(`[PARSER] 💭 Optional comment: "${comment || 'none'}"`);

      const tipCommand: TipCommand = {
        recipientAddress,
        amount,
        asset: asset as 'DOT' | 'USDC',
        comment,
        rawComment: normalizedComment
      };

      console.log(`[PARSER] 🎉 Parsing successful! Created tip command:`, {
        recipient: tipCommand.recipientAddress,
        amount: tipCommand.amount,
        asset: tipCommand.asset,
        comment: tipCommand.comment || 'none'
      });

      return {
        success: true,
        tipCommand
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log(`[PARSER] 💥 Parsing failed with exception: ${errorMessage}`);
      return {
        success: false,
        error: `Failed to parse comment: ${errorMessage}`
      };
    }
  }

  private static isValidAssetHubAddress(address: string): boolean {
    // Basic validation for Polkadot SS58 address format
    return this.ASSET_HUB_ADDRESS_REGEX.test(address);
  }

  private static isSupportedAsset(asset: string): asset is 'DOT' | 'USDC' {
    return this.SUPPORTED_ASSETS.includes(asset as 'DOT' | 'USDC');
  }

  // Utility method to extract all tip commands from a comment (in case of multiple)
  static parseMultipleTips(commentBody: string): ParseResult[] {
    const results: ParseResult[] = [];
    const lines = commentBody.split('\n');
    
    for (const line of lines) {
      const result = this.parseComment(line);
      if (result.success) {
        results.push(result);
      }
    }
    
    return results;
  }

  // Utility method to check if a comment contains any bot mention
  static containsBotMention(commentBody: string): boolean {
    const hasMention = commentBody.includes(this.BOT_MENTION);
    console.log(`[PARSER] 👁️ Bot mention check for "${commentBody.substring(0, 50)}${commentBody.length > 50 ? '...' : ''}": ${hasMention ? 'FOUND' : 'NOT FOUND'}`);
    return hasMention;
  }
}