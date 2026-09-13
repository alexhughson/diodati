import { expect, test } from "bun:test";
import { interactiveSshArgs, sshControlPath } from "./ssh";

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

test("interactive ssh pins a non-default identity before dest", () => {
  expect(interactiveSshArgs("alexh-chatbox.exe.xyz", "/Users/alex/.ssh/id_exe")).toEqual([
    "-o",
    "BatchMode=yes",
    "-o",
    "ConnectTimeout=20",
    "-o",
    "ControlMaster=no",
    "-o",
    "IdentitiesOnly=yes",
    "-o",
    "IdentityAgent=none",
    "-i",
    "/Users/alex/.ssh/id_exe",
    "-tt",
    "alexh-chatbox.exe.xyz",
  ]);
});

test("interactive ssh accepts routed team dests", () => {
  const args = interactiveSshArgs("vm+jevdev-3001eb18@vm.exe.xyz");
  expect(args[args.length - 1]).toBe("vm+jevdev-3001eb18@vm.exe.xyz");
});

test("interactive ssh rejects a dest that is a command string", () => {
  expect(() => interactiveSshArgs("host; id")).toThrow("refusing ssh dest");
});

test("control path adds an identity tag so a wrong-key master is not reused", () => {
  expect(sshControlPath(null)).toBe("/tmp/diodati-%C");
  const pinned = sshControlPath("/Users/alex/.ssh/id_exe");
  expect(pinned.startsWith("/tmp/diodati-%C-")).toBe(true);
  expect(pinned).not.toBe("/tmp/diodati-%C");
  expect(sshControlPath("/Users/alex/.ssh/id_ed25519")).not.toBe(pinned);
});
