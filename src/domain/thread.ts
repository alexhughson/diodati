import type { Folder, FolderId, MachineId, Thread, ThreadId } from "@shared/types";

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
};

export function folderIdFromCwd(cwd: string | null): FolderId {
  if (!cwd) {
    return "no-cwd";
  }
  return cwd;
}

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

export function folderFromCwd(cwd: string | null): Folder {
  return {
    id: folderIdFromCwd(cwd),
    cwd,
    label: folderLabel(cwd),
  };
}

export function threadFromRow(row: ShelleyConversationRow, machineId: MachineId): Thread {
  if (!row.conversation_id) {
    throw new Error("conversation row is missing conversation_id");
  }
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
  };
}

export function isTopLevelThread(row: ShelleyConversationRow): boolean {
  if (row.archived) {
    return false;
  }
  if (row.parent_conversation_id) {
    return false;
  }
  if (row.user_initiated === false) {
    return false;
  }
  return true;
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

export function sameThread(left: ThreadId, right: ThreadId): boolean {
  return left === right;
}
