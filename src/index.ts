import type { Probot } from "probot";
import { setupTippingBot } from "./tipping/bot.js";

/**
 * FluffyLabs Tipping Bot
 *
 * Command format: @fluffylabs-bot tip <address> <amount> <asset> [comment]
 * Supported assets: DOT, USDC
 */

export default (app: Probot) => {
  setupTippingBot(app);
};
