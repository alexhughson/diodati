import { expect, test } from "bun:test";
import { groupThreads, upsertThread } from "./catalog";
import type { Machine, Thread } from "@shared/types";

const machine: Machine = {
  id: "alley-tablebase",
  name: "alley-tablebase",
  emoji: "🎭",
  status: "running",
  sshDest: "alley-tablebase.exe.xyz",
  httpsUrl: "https://alley-tablebase.exe.xyz",
  shelleyUrl: "https://alley-tablebase.shelley.exe.xyz",
  terminalUrl: "https://alley-tablebase.xterm.exe.xyz",
  proxyPort: 8000,
  ownership: "owned",
  canShell: true,
};

function thread(partial: Partial<Thread> & Pick<Thread, "id">): Thread {
  return {
    machineId: machine.id,
    slug: partial.id,
    cwd: null,
    model: "gpt-5.6-sol",
    preview: "",
    updatedAt: "2026-09-11T12:00:00Z",
    isDraft: false,
    working: false,
    ...partial,
  };
}

test("one folder stays flat under the machine", () => {
  const catalog = groupThreads(machine, [
    thread({ id: "a", cwd: "/home/exedev/app" }),
    thread({ id: "b", cwd: "/home/exedev/app", updatedAt: "2026-09-11T13:00:00Z" }),
  ]);
  expect(catalog.flattenFolders).toBe(true);
  expect(catalog.groups.length).toBe(1);
  expect(catalog.groups[0]?.folder.label).toBe("app");
  expect(catalog.groups[0]?.threads.map((item) => item.id)).toEqual(["b", "a"]);
});

test("multiple folders become a sub-level", () => {
  const catalog = groupThreads(machine, [
    thread({ id: "a", cwd: "/home/exedev/app" }),
    thread({ id: "c", cwd: "/home/exedev/other" }),
  ]);
  expect(catalog.flattenFolders).toBe(false);
  expect(catalog.groups.map((group) => group.folder.label)).toEqual(["app", "other"]);
});

test("missing cwd uses a single no-folder group", () => {
  const catalog = groupThreads(machine, [thread({ id: "a", cwd: null })]);
  expect(catalog.flattenFolders).toBe(true);
  expect(catalog.groups[0]?.folder.id).toBe("no-cwd");
});

test("upsertThread adds a draft to an empty catalog", () => {
  const catalog = groupThreads(machine, []);
  const next = upsertThread(
    catalog,
    thread({ id: "draft-1", cwd: "/home/exedev/app", isDraft: true }),
  );
  expect(next.groups[0]?.threads[0]?.id).toBe("draft-1");
});
