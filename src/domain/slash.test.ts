import { expect, test } from "bun:test";
import { completeSlashCommand, matchingSlashCommands, slashToken } from "./slash";

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
