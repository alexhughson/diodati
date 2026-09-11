import { expect, test } from "bun:test";
import { displayFolder } from "./thread";

test("home folders get a tilde prefix", () => {
  expect(displayFolder("/home/exedev/app", "/home/exedev")).toBe("~/app");
  expect(displayFolder("/home/exedev", "/home/exedev")).toBe("~");
  expect(displayFolder("/home/exedev/Code/exevibe", "/home/exedev")).toBe("~/exevibe");
});

test("non-home folders keep the last segment", () => {
  expect(displayFolder("/opt/app", "/home/exedev")).toBe("app");
  expect(displayFolder(null, "/home/exedev")).toBe("no folder");
});
