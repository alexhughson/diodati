import { expect, test } from "bun:test";
import { contextUsageLevel, formatTokenCount, maxContextTokensFor } from "./contextUsage";
import type { Model } from "@shared/types";

function model(id: string, maxContextTokens: number): Model {
  return {
    id,
    displayName: id,
    source: "test",
    ready: true,
    isDefault: false,
    tier: 1,
    supportsReasoning: false,
    reasoningLevels: [],
    defaultReasoningLevel: null,
    maxContextTokens,
  };
}

test("absolute token steps match Shelley", () => {
  expect(contextUsageLevel(99_999, 0)).toBe("");
  expect(contextUsageLevel(100_000, 0)).toBe("warn");
  expect(contextUsageLevel(200_000, 0)).toBe("high");
  expect(contextUsageLevel(300_000, 0)).toBe("critical");
});

test("a small window on this machine colors by fraction", () => {
  expect(contextUsageLevel(13_000, 20_000)).toBe("");
  expect(contextUsageLevel(14_000, 20_000)).toBe("warn");
  expect(contextUsageLevel(16_000, 20_000)).toBe("high");
  expect(contextUsageLevel(18_000, 20_000)).toBe("critical");
});

test("max context comes only from the models on this machine", () => {
  const alley = [model("gpt-5.6-sol", 200_000)];
  const professor = [model("claude-sonnet-4.5", 1_000_000), model("gpt-5.6-sol", 400_000)];
  expect(maxContextTokensFor(alley, "gpt-5.6-sol")).toBe(200_000);
  expect(maxContextTokensFor(professor, "gpt-5.6-sol")).toBe(400_000);
  expect(maxContextTokensFor(alley, "claude-sonnet-4.5")).toBe(0);
});

test("formatTokenCount uses k after one thousand", () => {
  expect(formatTokenCount(800)).toBe("800");
  expect(formatTokenCount(128_000)).toBe("128k");
});
