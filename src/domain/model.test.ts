import { expect, test } from "bun:test";
import { modelFromRow, modelOnList, pickModelOnList, thinkingLevelFromOptions } from "./model";

test("modelFromRow reads this machine's context window", () => {
  const model = modelFromRow({
    id: "gpt-5.6-sol",
    ready: true,
    max_context_tokens: 400000,
  });
  expect(model.maxContextTokens).toBe(400000);
});

test("pickModelOnList never takes a model from another machine", () => {
  const alley = [
    modelFromRow({
      id: "gpt-5.6-sol",
      ready: true,
      is_default: true,
      max_context_tokens: 200000,
    }),
  ];
  expect(pickModelOnList(alley, "claude-sonnet-4.5")?.id).toBe("gpt-5.6-sol");
  expect(pickModelOnList(alley, "gpt-5.6-sol")?.id).toBe("gpt-5.6-sol");
  expect(modelOnList(alley, "gpt-6.1-sol")).toBeNull();
});

test("thinkingLevelFromOptions reads the conversation options string", () => {
  expect(thinkingLevelFromOptions('{"thinking_level":"high"}')).toBe("high");
  expect(thinkingLevelFromOptions({ thinking_level: "medium" })).toBe("medium");
  expect(thinkingLevelFromOptions("default")).toBeNull();
});
