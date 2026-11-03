import { eveChannel, defaultEveAuth } from "eve/channels/eve";
import { vercelOidc } from "eve/channels/auth";

import { browserChannelEvents } from "../lib/browser-runtime";
import { localOperatorAuth, operatorAuth } from "../../server/operator-auth";

const ALLOWED_PROVIDERS = new Set(["cerebras", "claude", "anthropic", "openai"]);

export default eveChannel({
  auth: [operatorAuth, vercelOidc(), localOperatorAuth],
  events: browserChannelEvents,
  onMessage(ctx) {
    const baseAuth = defaultEveAuth(ctx);
    const header = ctx.eve.request.headers.get("x-bell-provider")?.toLowerCase().trim();
    const provider = header && ALLOWED_PROVIDERS.has(header) ? header : undefined;
    const auth = baseAuth && provider
      ? {
          ...baseAuth,
          attributes: { ...baseAuth.attributes, provider },
        }
      : baseAuth;
    return {
      auth,
      context: [
        "Narrate while you work: before any tool call that will take more than a second "
        + "(browse, search, fetch, screenshot), emit one short status line (≤ 10 words) "
        + "saying what you're about to do. After useful tool results, emit a brief one-line "
        + "update. These status lines appear live in the chat; keep them tight.",
      ],
    };
  },
});
