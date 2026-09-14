import { expect, test } from "bun:test";
import { compactInstructions, completeSlashCommand, matchingSlashCommands, slashToken } from "./slash";

test("a lone slash matches every command", () => {
  expect(slashToken("/")).toBe("");
  expect(matchingSlashCommands("/").map((item) => item.command)).toContain("/model");
  expect(matchingSlashCommands("/").length).toBeGreaterThan(1);
});

test("a prefix keeps only matching commands", () => {
  expect(matchingSlashCommands("/co").map((item) => item.command)).toEqual(["/compact"]);
  expect(matchingSlashCommands("/d").map((item) => item.command)).toEqual(["/diff", "/distill"]);
  expect(matchingSlashCommands("/diff").map((item) => item.command)).toEqual(["/diff"]);
});

test("text with a space is not a slash token", () => {
  expect(slashToken("/model ")).toBeNull();
  expect(matchingSlashCommands("/model gpt")).toEqual([]);
});

test("complete adds a space only when the command takes args", () => {
  expect(completeSlashCommand({ command: "/model", description: "", takesArgs: true })).toBe("/model ");
  expect(completeSlashCommand({ command: "/clear", description: "", takesArgs: false })).toBe("/clear");
});

test("compactInstructions reads /compact and /distill and ignores other text", () => {
  expect(compactInstructions("/compact")).toBe("");
  expect(compactInstructions("/compact keep the API")).toBe("keep the API");
  expect(compactInstructions("/distill")).toBe("");
  expect(compactInstructions("/distill focus on tests")).toBe("focus on tests");
  expect(compactInstructions("/compaction")).toBeNull();
  expect(compactInstructions("please /compact")).toBeNull();
});
