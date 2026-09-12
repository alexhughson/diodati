import { expect, test } from "bun:test";
import { classifyExeConnectError, firstErrorLine } from "./exeConnect";

test("firstErrorLine strips the electron ipc wrapper", () => {
  expect(
    firstErrorLine("Error invoking remote method 'machines.list': Error: ssh exe.dev ls --json: Permission denied (publickey)."),
  ).toBe("ssh exe.dev ls --json: Permission denied (publickey).");
});

test("classifyExeConnectError treats publickey failures as a missing exe.dev key", () => {
  expect(classifyExeConnectError("ssh exe.dev ls --json: Permission denied (publickey).")).toBe("needs-key");
  expect(classifyExeConnectError("known_hosts has no exe.dev key; ssh to exe.dev once first")).toBe("needs-key");
  expect(classifyExeConnectError("Too many authentication failures")).toBe("needs-key");
  expect(classifyExeConnectError("Host key verification failed.")).toBe("needs-key");
});

test("classifyExeConnectError leaves timeouts as other", () => {
  expect(classifyExeConnectError("ssh timed out: exe.dev ls --json")).toBe("other");
  expect(classifyExeConnectError("Could not resolve hostname exe.dev")).toBe("other");
});
