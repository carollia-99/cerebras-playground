import { anthropic } from "@ai-sdk/anthropic";
import { cerebras } from "@ai-sdk/cerebras";
import { openai } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import { defineAgent, defineDynamic } from "eve";

// Cross-provider type mismatch (eve pins @ai-sdk/provider slightly behind
// the anthropic/cerebras packages); runtime shapes match, so cast once here.
const cerebrasModel = cerebras(process.env.CEREBRAS_MODEL ?? "qwen-3.8-27b") as unknown as LanguageModel;
const claudeModel = anthropic(process.env.COMPARE_ANTHROPIC_MODEL ?? "claude-sonnet-5-5") as unknown as LanguageModel;
const openaiModel = openai.responses(process.env.BELL_MODEL ?? "gpt-5.6-sol");

const defaultProvider = (process.env.BELL_PROVIDER ?? "cerebras").toLowerCase();

function pickModel(provider: string | undefined) {
  switch (provider ?? defaultProvider) {
    case "claude":
    case "anthropic":
      return { model: claudeModel, modelContextWindowTokens: 200_000 };
    case "openai":
      return { model: openaiModel };
    case "cerebras":
    default:
      return {
        model: cerebrasModel,
        modelContextWindowTokens: 128_000,
        // qwen-3.8-27b is not a reasoning model; providerOptions kept
        // minimal. If swapping back to gpt-oss-120b, add
        // providerOptions.cerebras.reasoningFormat="parsed" so CoT doesn't
        // leak into text.
      };
  }
}

export default defineAgent({
  model: defineDynamic({
    events: {
      "step.started": (_event, ctx) => {
        const attr = ctx.session.auth.initiator?.attributes?.provider;
        const provider = Array.isArray(attr) ? attr[0] : attr;
        return pickModel(provider);
      },
    },
  }),
  build: {
    externalDependencies: [
      "@1password/sdk",
      "@ai-sdk/anthropic",
      "@ai-sdk/cerebras",
      "@browserbasehq/sdk",
      "@browserbasehq/stagehand",
      "playwright-core",
      "pg",
    ],
  },
  limits: { sessionTimeoutMs: 24 * 60 * 60 * 1_000 },
});
