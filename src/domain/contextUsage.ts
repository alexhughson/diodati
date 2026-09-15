import type { Model } from "@shared/types";

export type ContextUsageLevel = "" | "warn" | "high" | "critical";

const WARN_TOKENS = 100_000;
const HIGH_TOKENS = 200_000;
const CRITICAL_TOKENS = 300_000;
const WARN_FRACTION = 0.7;
const HIGH_FRACTION = 0.8;
const CRITICAL_FRACTION = 0.9;

export function contextUsageLevel(tokens: number, maxContextTokens: number): ContextUsageLevel {
  const fraction = maxContextTokens > 0 ? tokens / maxContextTokens : 0;
  if (tokens >= CRITICAL_TOKENS || fraction >= CRITICAL_FRACTION) {
    return "critical";
  }
  if (tokens >= HIGH_TOKENS || fraction >= HIGH_FRACTION) {
    return "high";
  }
  if (tokens >= WARN_TOKENS || fraction >= WARN_FRACTION) {
    return "warn";
  }
  return "";
}

export function maxContextTokensFor(models: Model[], modelId: string): number {
  for (const model of models) {
    if (model.id === modelId) {
      return model.maxContextTokens;
    }
  }
  return 0;
}

export function formatTokenCount(tokens: number): string {
  if (tokens >= 999_500_000) {
    return `${(tokens / 1e9).toFixed(1)}B`;
  }
  if (tokens >= 999_500) {
    return `${(tokens / 1e6).toFixed(1)}M`;
  }
  if (tokens >= 1e3) {
    return `${(tokens / 1e3).toFixed(0)}k`;
  }
  return String(tokens);
}
