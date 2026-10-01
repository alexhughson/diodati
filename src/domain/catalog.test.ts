import { expect, test } from "bun:test";
import {
  bumpCatalogWrite,
  groupThreads,
  isCurrentCatalogWrite,
  mergePolledCatalogs,
  replaceMachineCatalog,
  replaceThread,
} from "./catalog";
import type { Machine, MachineCatalog, Thread } from "@shared/types";

const machine: Machine = {
  id: "alley-tablebase",
  name: "alley-tablebase",
  emoji: "🎭",
  status: "running",
  sshDest: "alley-tablebase.exe.xyz",
  httpsUrl: "https://alley-tablebase.exe.xyz",
  ownership: "owned",
  canShell: true,
  accountEmail: "alex@getjevy.com",
  identityFile: null,
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
    parentId: null,
    ...partial,
  };
}

test("one folder stays a single group", () => {
  const groups = groupThreads([
    thread({ id: "a", cwd: "/home/exedev/app" }),
    thread({ id: "b", cwd: "/home/exedev/app", updatedAt: "2026-09-11T13:00:00Z" }),
  ]);
  expect(groups.length).toBe(1);
  expect(groups[0]?.cwd).toBe("/home/exedev/app");
  expect(groups[0]?.threads.map((item) => item.id)).toEqual(["b", "a"]);
});

test("multiple folders become separate groups", () => {
  const groups = groupThreads([
    thread({ id: "a", cwd: "/home/exedev/app" }),
    thread({ id: "c", cwd: "/home/exedev/other" }),
  ]);
  expect(groups.map((group) => group.cwd)).toEqual(["/home/exedev/app", "/home/exedev/other"]);
});

test("missing cwd uses a single no-folder group", () => {
  const groups = groupThreads([thread({ id: "a", cwd: null })]);
  expect(groups.length).toBe(1);
  expect(groups[0]?.cwd).toBeNull();
});

test("replaceThread adds a draft at the front", () => {
  const next = replaceThread(
    [],
    thread({ id: "draft-1", cwd: "/home/exedev/app", isDraft: true }),
  );
  expect(next[0]?.id).toBe("draft-1");
});

function catalog(threads: Thread[]): MachineCatalog {
  return { machine, threads, loadError: null, homeDir: "/home/exedev" };
}

test("a later write token invalidates an in-flight catalog poll", () => {
  const first = bumpCatalogWrite({}, machine.id);
  const second = bumpCatalogWrite(first.seq, machine.id);
  expect(isCurrentCatalogWrite(second.seq, machine.id, first.token)).toBe(false);
  expect(isCurrentCatalogWrite(second.seq, machine.id, second.token)).toBe(true);

  const current = [catalog([thread({ id: "from-stream" })])];
  const polled = [catalog([thread({ id: "from-poll" })])];
  const merged = mergePolledCatalogs(current, polled, { [machine.id]: first.token }, second.seq);
  expect(merged[0]?.threads.map((item) => item.id)).toEqual(["from-stream"]);

  const applied = mergePolledCatalogs(current, polled, { [machine.id]: second.token }, second.seq);
  expect(applied[0]?.threads.map((item) => item.id)).toEqual(["from-poll"]);
});

test("replaceMachineCatalog leaves other machines alone", () => {
  const other: Machine = { ...machine, id: "other-box", name: "other-box" };
  const current: MachineCatalog[] = [
    catalog([thread({ id: "keep" })]),
    { machine: other, threads: [thread({ id: "other", machineId: other.id })], loadError: null, homeDir: null },
  ];
  const next = replaceMachineCatalog(current, catalog([thread({ id: "new" })]));
  expect(next[0]?.threads[0]?.id).toBe("new");
  expect(next[1]?.threads[0]?.id).toBe("other");
});
