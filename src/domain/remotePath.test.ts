import { expect, test } from "bun:test";
import { folderName, joinDir, normalizeDir, parentDir } from "./remotePath";

test("normalizeDir strips trailing slashes", () => {
  expect(normalizeDir("/home/exedev/app/")).toBe("/home/exedev/app");
  expect(normalizeDir("/")).toBe("/");
});

test("parentDir walks up one level", () => {
  expect(parentDir("/home/exedev/app")).toBe("/home/exedev");
  expect(parentDir("/home")).toBe("/");
  expect(parentDir("/")).toBeNull();
});

test("joinDir appends a single folder name", () => {
  expect(joinDir("/home/exedev", "app")).toBe("/home/exedev/app");
  expect(joinDir("/", "tmp")).toBe("/tmp");
});

test("joinDir rejects path fragments", () => {
  expect(() => joinDir("/home/exedev", "..")).toThrow("refusing folder name");
  expect(() => joinDir("/home/exedev", "a/b")).toThrow("refusing folder name");
});

test("folderName is the last segment", () => {
  expect(folderName("/home/exedev/app")).toBe("app");
  expect(folderName("/")).toBe("/");
});
