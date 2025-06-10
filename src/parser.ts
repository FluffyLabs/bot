export interface TipCommand {
  recipientAddress: string;
  amount: number;
  asset: 'DOT' | 'USDC';
  comment?: string;
  rawComment: string;
}

export interface ParseResult {
  success: boolean;
  tipCommand?: TipCommand;
  error?: string;
}

export class CommentParser {
  private static readonly BOT_MENTION = '@fluffylabs-bot';
  private static readonly TIP_COMMAND = 'tip';
  private static readonly SUPPORTED_ASSETS = ['DOT', 'USDC'] as const;
  
  // Asset Hub address validation (Polkadot SS58 format)
  private static readonly ASSET_HUB_ADDRESS_REGEX = /^[1-9A-HJ-NP-Za-km-z]{47,48}$/;

  static parseComment(commentBody: string): ParseResult {
    try {
      // Normalize whitespace and trim
      const normalizedComment = commentBody.trim().replace(/\s+/g, ' ');
      
      // Check if comment mentions the bot
      if (!normalizedComment.includes(this.BOT_MENTION)) {
        return {
          success: false,
          error: 'Comment does not mention the bot'
        };
      }

      // Find the tip command after bot mention
      const botMentionIndex = normalizedComment.indexOf(this.BOT_MENTION);
      const afterBotMention = normalizedComment.substring(botMentionIndex + this.BOT_MENTION.length).trim();
      
      // Check if it starts with tip command
      if (!afterBotMention.toLowerCase().startsWith(this.TIP_COMMAND)) {
        return {
          success: false,
          error: 'Comment does not contain a tip command'
        };
      }

      // Extract the command part (everything after "tip")
      const commandPart = afterBotMention.substring(this.TIP_COMMAND.length).trim();
      
      if (!commandPart) {
        return {
          success: false,
          error: 'Incomplete tip command'
        };
      }

      // Split the command into parts
      const parts = commandPart.split(' ');
      
      if (parts.length < 3) {
        return {
          success: false,
          error: 'Tip command requires at least: address, amount, and asset'
        };
      }

      const [addressPart, amountPart, assetPart, ...commentParts] = parts;

      // Validate address
      const recipientAddress = addressPart.trim();
      if (!this.isValidAssetHubAddress(recipientAddress)) {
        return {
          success: false,
          error: 'Invalid Asset Hub address format'
        };
      }

      // Validate amount
      const amount = parseFloat(amountPart);
      if (isNaN(amount) || amount <= 0) {
        return {
          success: false,
          error: 'Amount must be a positive number'
        };
      }

      // Validate asset
      const asset = assetPart.toUpperCase();
      if (!this.isSupportedAsset(asset)) {
        return {
          success: false,
          error: `Unsupported asset. Supported assets: ${this.SUPPORTED_ASSETS.join(', ')}`
        };
      }

      // Extract optional comment
      const comment = commentParts.length > 0 ? commentParts.join(' ') : undefined;

      const tipCommand: TipCommand = {
        recipientAddress,
        amount,
        asset: asset as 'DOT' | 'USDC',
        comment,
        rawComment: normalizedComment
      };

      return {
        success: true,
        tipCommand
      };

    } catch (error) {
      return {
        success: false,
        error: `Failed to parse comment: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private static isValidAssetHubAddress(address: string): boolean {
    // Basic validation for Polkadot SS58 address format
    return this.ASSET_HUB_ADDRESS_REGEX.test(address);
  }

  private static isSupportedAsset(asset: string): asset is 'DOT' | 'USDC' {
    return this.SUPPORTED_ASSETS.includes(asset as any);
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
    return commentBody.includes(this.BOT_MENTION);
  }
}