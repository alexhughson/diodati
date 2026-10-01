import { thinkingLevelFromOptions } from "./model";
import type { MachineId, Thread } from "@shared/types";

export type ShelleyConversationRow = {
  conversation_id: string;
  slug: string | null;
  cwd: string | null;
  model: string | null;
  preview?: string;
  updated_at: string;
  is_draft: boolean;
  archived?: boolean;
  working?: boolean;
  agent_working?: boolean;
  parent_conversation_id?: string | null;
  user_initiated?: boolean;
  conversation_options?: unknown;
};

export function folderLabel(cwd: string | null): string {
  if (!cwd) {
    return "no folder";
  }
  const parts = cwd.split("/").filter((part) => part.length > 0);
  if (parts.length === 0) {
    return cwd;
  }
  return parts[parts.length - 1] ?? cwd;
}

export function isHomePath(cwd: string, homeDir: string | null): boolean {
  if (homeDir) {
    return cwd === homeDir || cwd.startsWith(`${homeDir}/`);
  }
  return /^\/home\/[^/]+(\/|$)/.test(cwd);
}

export function displayFolder(cwd: string | null, homeDir: string | null): string {
  if (!cwd) {
    return "no folder";
  }
  const name = folderLabel(cwd);
  if (homeDir && (cwd === homeDir || cwd === `${homeDir}/`)) {
    return "~";
  }
  if (isHomePath(cwd, homeDir)) {
    return `~/${name}`;
  }
  return name;
}

export function threadFromRow(row: ShelleyConversationRow, machineId: MachineId): Thread {
  if (!row.conversation_id) {
    throw new Error("conversation row is missing conversation_id");
  }
  const parentId = row.parent_conversation_id;
  return {
    id: row.conversation_id,
    machineId,
    slug: row.slug,
    cwd: row.cwd,
    model: row.model,
    preview: row.preview ?? "",
    updatedAt: row.updated_at,
    isDraft: row.is_draft,
    working: row.working === true || row.agent_working === true,
    parentId: parentId && parentId.length > 0 ? parentId : null,
    thinkingLevel: thinkingLevelFromOptions(row.conversation_options),
  };
}

// A subagent row has parent_conversation_id. Shelley also sets
// user_initiated to false on that row. Keep it so the sidebar can nest it.
export function isCatalogThread(row: ShelleyConversationRow): boolean {
  if (row.archived) {
    return false;
  }
  if (row.parent_conversation_id) {
    return true;
  }
  if (row.user_initiated === false) {
    return false;
  }
  return true;
}

export function keepLinkedThreads(threads: Thread[]): Thread[] {
  const ids = new Set<string>();
  for (const thread of threads) {
    ids.add(thread.id);
  }
  const kept: Thread[] = [];
  for (const thread of threads) {
    if (thread.parentId === null || ids.has(thread.parentId)) {
      kept.push(thread);
    }
  }
  return kept;
}

export function threadsFromRows(rows: ShelleyConversationRow[], machineId: MachineId): Thread[] {
  const threads: Thread[] = [];
  for (const row of rows) {
    if (!isCatalogThread(row)) {
      continue;
    }
    threads.push(threadFromRow(row, machineId));
  }
  return keepLinkedThreads(threads);
}

export function selectedThreadOnMachine(
  selectedMachineId: string | null,
  machineId: string,
  selectedThreadId: string | null,
): string | null {
  if (selectedMachineId !== machineId) {
    return null;
  }
  return selectedThreadId;
}

type ListOp = {
  op?: string;
  path?: string;
  value?: unknown;
};

function isConversationRow(value: unknown): value is ShelleyConversationRow {
  if (!value || typeof value !== "object") {
    return false;
  }
  const id = (value as { conversation_id?: unknown }).conversation_id;
  return typeof id === "string" && id.length > 0;
}

// stream2 sends conversation_list_patch. A reset replaces the whole list.
export function threadsFromListReset(
  patch: { reset?: boolean; patch?: ListOp[] },
  machineId: MachineId,
): Thread[] | null {
  if (patch.reset !== true || !patch.patch) {
    return null;
  }
  for (const op of patch.patch) {
    if (op.op !== "replace" || op.path !== "") {
      continue;
    }
    if (!Array.isArray(op.value)) {
      return null;
    }
    const rows: ShelleyConversationRow[] = [];
    for (const item of op.value) {
      if (!isConversationRow(item)) {
        return null;
      }
      rows.push(item);
    }
    return threadsFromRows(rows, machineId);
  }
  return null;
}

export function topLevelThreads(threads: Thread[]): Thread[] {
  const top: Thread[] = [];
  for (const thread of threads) {
    if (thread.parentId === null) {
      top.push(thread);
    }
  }
  return top;
}

export function visibleSubagents(threads: Thread[], parentId: string, selectedThreadId: string | null): Thread[] {
  if (selectedThreadId === null) {
    return [];
  }
  let familyOpen = selectedThreadId === parentId;
  if (!familyOpen) {
    for (const thread of threads) {
      if (thread.id === selectedThreadId && thread.parentId === parentId) {
        familyOpen = true;
        break;
      }
    }
  }
  if (!familyOpen) {
    return [];
  }
  const children: Thread[] = [];
  for (const thread of threads) {
    if (thread.parentId === parentId) {
      children.push(thread);
    }
  }
  children.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  return children;
}

export function threadTitle(thread: Thread): string {
  if (thread.isDraft && !thread.slug) {
    return "draft";
  }
  if (thread.slug && thread.slug.length > 0) {
    return thread.slug;
  }
  return thread.id.slice(0, 8);
}

