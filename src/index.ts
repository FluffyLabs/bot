import type { Probot } from "probot";
import { setupTippingBot } from "./tipping/bot.js";

export default (app: Probot) => {
  app.log.info('Hello world!');
  setupTippingBot(app);
};
