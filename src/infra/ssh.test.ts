import { expect, test } from "bun:test";
import { interactiveSshArgs } from "./ssh";

test("interactive ssh keeps dest as the last operand", () => {
  expect(interactiveSshArgs("alley-tablebase.exe.xyz")).toEqual([
    "-o",
    "BatchMode=yes",
    "-o",
    "ConnectTimeout=20",
    "-o",
    "ControlMaster=no",
    "-tt",
    "alley-tablebase.exe.xyz",
  ]);
});

test("interactive ssh accepts routed team dests", () => {
  const args = interactiveSshArgs("vm+jevdev-3001eb18@vm.exe.xyz");
  expect(args[args.length - 1]).toBe("vm+jevdev-3001eb18@vm.exe.xyz");
});

test("interactive ssh rejects a dest that is a command string", () => {
  expect(() => interactiveSshArgs("host; id")).toThrow("refusing ssh dest");
});
