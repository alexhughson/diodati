import { expect, test } from "bun:test";
import {
  displayFolder,
  isCatalogThread,
  keepLinkedThreads,
  selectedThreadOnMachine,
  threadFromRow,
  threadsFromListReset,
  topLevelThreads,
  visibleSubagents,
  type ShelleyConversationRow,
} from "./thread";
import type { Thread } from "@shared/types";

test("home folders get a tilde prefix", () => {
  expect(displayFolder("/home/exedev/app", "/home/exedev")).toBe("~/app");
  expect(displayFolder("/home/exedev", "/home/exedev")).toBe("~");
  expect(displayFolder("/home/exedev/Code/exevibe", "/home/exedev")).toBe("~/exevibe");
});

test("non-home folders keep the last segment", () => {
  expect(displayFolder("/opt/app", "/home/exedev")).toBe("app");
  expect(displayFolder(null, "/home/exedev")).toBe("no folder");
});

function row(partial: Partial<ShelleyConversationRow> & Pick<ShelleyConversationRow, "conversation_id">): ShelleyConversationRow {
  return {
    slug: partial.conversation_id,
    cwd: "/home/exedev",
    model: "gpt-5.6-sol",
    updated_at: "2026-09-11T12:00:00Z",
    is_draft: false,
    ...partial,
  };
}

function thread(partial: Partial<Thread> & Pick<Thread, "id">): Thread {
  return {
    machineId: "box",
    slug: partial.id,
    cwd: "/home/exedev",
    model: "gpt-5.6-sol",
    preview: "",
    updatedAt: "2026-09-11T12:00:00Z",
    isDraft: false,
    working: false,
    parentId: null,
    ...partial,
  };
}

test("catalog keeps a subagent and drops an archived row", () => {
  expect(isCatalogThread(row({ conversation_id: "parent" }))).toBe(true);
  expect(
    isCatalogThread(row({ conversation_id: "child", parent_conversation_id: "parent", user_initiated: false })),
  ).toBe(true);
  expect(isCatalogThread(row({ conversation_id: "system", user_initiated: false }))).toBe(false);
  expect(isCatalogThread(row({ conversation_id: "old", archived: true }))).toBe(false);
});

test("threadFromRow keeps the parent id", () => {
  const child = threadFromRow(
    row({ conversation_id: "child", parent_conversation_id: "parent", user_initiated: false }),
    "box",
  );
  expect(child.parentId).toBe("parent");
  const parent = threadFromRow(row({ conversation_id: "parent", parent_conversation_id: null }), "box");
  expect(parent.parentId).toBeNull();
});

test("subagents show under the open parent and stay hidden otherwise", () => {
  const parent = thread({ id: "parent", updatedAt: "2026-09-11T12:00:00Z" });
  const older = thread({ id: "older", parentId: "parent", updatedAt: "2026-09-11T12:00:00Z" });
  const newer = thread({ id: "newer", parentId: "parent", updatedAt: "2026-09-11T13:00:00Z" });
  const other = thread({ id: "other" });
  const threads = [parent, older, newer, other];
  expect(topLevelThreads(threads).map((item) => item.id)).toEqual(["parent", "other"]);
  expect(visibleSubagents(threads, "parent", null)).toEqual([]);
  expect(visibleSubagents(threads, "parent", "other")).toEqual([]);
  expect(visibleSubagents(threads, "parent", "parent").map((item) => item.id)).toEqual(["newer", "older"]);
  expect(visibleSubagents(threads, "parent", "older").map((item) => item.id)).toEqual(["newer", "older"]);
});

test("selected thread is ignored on a different machine", () => {
  expect(selectedThreadOnMachine("box-a", "box-b", "parent")).toBeNull();
  expect(selectedThreadOnMachine("box-a", "box-a", "parent")).toBe("parent");
});

test("a subagent with no parent row is dropped from the catalog", () => {
  const kept = keepLinkedThreads([
    thread({ id: "parent" }),
    thread({ id: "child", parentId: "parent" }),
    thread({ id: "orphan", parentId: "missing" }),
  ]);
  expect(kept.map((item) => item.id)).toEqual(["parent", "child"]);
});

test("a stream list reset keeps the subagent and drops archived rows", () => {
  const threads = threadsFromListReset(
    {
      reset: true,
      patch: [
        {
          op: "replace",
          path: "",
          value: [
            row({ conversation_id: "parent", user_initiated: true }),
            row({ conversation_id: "child", parent_conversation_id: "parent", user_initiated: false }),
            row({ conversation_id: "old", archived: true, user_initiated: true }),
            row({ conversation_id: "orphan", parent_conversation_id: "gone", user_initiated: false }),
          ],
        },
      ],
    },
    "box",
  );
  expect(threads?.map((item) => item.id)).toEqual(["parent", "child"]);
  expect(threads?.[1]?.parentId).toBe("parent");
  expect(threadsFromListReset({ reset: false, patch: [] }, "box")).toBeNull();
});
