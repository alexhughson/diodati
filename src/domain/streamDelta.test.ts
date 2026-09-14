import { expect, test } from "bun:test";
import { liveStreamKind } from "./streamDelta";

test("liveStreamKind keeps text and thinking and drops other types", () => {
  expect(liveStreamKind("text")).toBe("text");
  expect(liveStreamKind("thinking")).toBe("thinking");
  expect(liveStreamKind("tool_input")).toBeNull();
  expect(liveStreamKind("")).toBeNull();
});
