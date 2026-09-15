import { modelsFromRows, type ShelleyModelRow } from "@domain/model";
import { isTopLevelThread, threadFromRow, type ShelleyConversationRow } from "@domain/thread";
import type { ShelleyMessageRow } from "@domain/message";
import type { ComposerOptions, Machine, Model, Thread } from "@shared/types";
import { remoteCurlGet, remoteCurlPost, requireOk, runSsh } from "./ssh";

type Snapshot = {
  conversations: ShelleyConversationRow[];
  hash: string;
};

type ConversationResponse = {
  messages?: ShelleyMessageRow[];
  conversation?: ShelleyConversationRow;
  context_window_size?: number;
};

export async function shelleyGetJson<T>(machine: Machine, path: string): Promise<T> {
  const result = await runSsh(machine.sshDest, remoteCurlGet(path), {
    identityFile: machine.identityFile,
  });
  const stdout = requireOk(result, `shelley GET ${path} on ${machine.id}`);
  if (stdout.trim().length === 0) {
    throw new Error(`shelley GET ${path} on ${machine.id} returned empty body`);
  }
  return JSON.parse(stdout) as T;
}

export async function shelleyPostJson<T>(machine: Machine, path: string, body: unknown): Promise<T> {
  const result = await runSsh(machine.sshDest, remoteCurlPost(path), {
    stdin: JSON.stringify(body),
    identityFile: machine.identityFile,
  });
  const stdout = requireOk(result, `shelley POST ${path} on ${machine.id}`);
  const trimmed = stdout.trim();
  const newline = trimmed.lastIndexOf("\n");
  const statusText = newline >= 0 ? trimmed.slice(newline + 1) : trimmed;
  const payloadText = newline >= 0 ? trimmed.slice(0, newline) : "";
  const status = Number(statusText);
  if (!Number.isFinite(status) || status < 200 || status >= 300) {
    throw new Error(`shelley POST ${path} on ${machine.id} returned ${statusText}: ${payloadText}`);
  }
  if (payloadText.length === 0) {
    return {} as T;
  }
  return JSON.parse(payloadText) as T;
}

export async function machineHomeDir(machine: Machine): Promise<string | null> {
  const result = await runSsh(machine.sshDest, 'printf %s "$HOME"', {
    identityFile: machine.identityFile,
  });
  const home = requireOk(result, `home dir on ${machine.id}`).trim();
  if (home.length === 0) {
    return null;
  }
  return home;
}

export async function listMachineThreads(machine: Machine): Promise<Thread[]> {
  const snapshot = await shelleyGetJson<Snapshot>(machine, "/api/conversations/snapshot");
  const threads: Thread[] = [];
  for (const row of snapshot.conversations) {
    if (!isTopLevelThread(row)) {
      continue;
    }
    threads.push(threadFromRow(row, machine.id));
  }
  return threads;
}

export async function listMachineModels(machine: Machine): Promise<Model[]> {
  const rows = await shelleyGetJson<ShelleyModelRow[]>(machine, "/api/models");
  return modelsFromRows(rows);
}

export async function loadThreadMessages(machine: Machine, threadId: string): Promise<{
  thread: Thread;
  rows: ShelleyMessageRow[];
  contextWindowSize: number;
}> {
  const payload = await shelleyGetJson<ConversationResponse>(machine, `/api/conversation/${threadId}`);
  if (!payload.conversation) {
    throw new Error(`shelley conversation ${threadId} on ${machine.id} has no conversation object`);
  }
  return {
    thread: threadFromRow(payload.conversation, machine.id),
    rows: payload.messages ?? [],
    contextWindowSize: payload.context_window_size ?? 0,
  };
}

export async function createDraft(machine: Machine, options: ComposerOptions): Promise<Thread> {
  const body: Record<string, unknown> = {
    draft: "",
    model: options.model,
  };
  if (options.cwd) {
    body.cwd = options.cwd;
  }
  if (options.thinkingLevel) {
    body.conversation_options = { thinking_level: options.thinkingLevel };
  }
  const row = await shelleyPostJson<ShelleyConversationRow>(machine, "/api/conversations/draft", body);
  return threadFromRow(row, machine.id);
}

export async function startNewGeneration(machine: Machine, threadId: string): Promise<Thread> {
  const row = await shelleyPostJson<ShelleyConversationRow>(
    machine,
    `/api/conversation/${threadId}/new-generation`,
    {},
  );
  return threadFromRow(row, machine.id);
}

export async function startCompaction(
  machine: Machine,
  threadId: string,
  options: ComposerOptions,
  instructions: string,
): Promise<void> {
  const body: Record<string, unknown> = {
    source_conversation_id: threadId,
    model: options.model,
    method: "compact",
  };
  if (options.cwd) {
    body.cwd = options.cwd;
  }
  if (instructions.length > 0) {
    body.instructions = instructions;
  }
  await shelleyPostJson(machine, "/api/conversations/distill-new-generation", body);
}

export async function sendChat(
  machine: Machine,
  threadId: string,
  message: string,
  options: ComposerOptions,
): Promise<void> {
  const body: Record<string, unknown> = {
    message,
    model: options.model,
  };
  if (options.cwd) {
    body.cwd = options.cwd;
  }
  if (options.thinkingLevel) {
    body.conversation_options = { thinking_level: options.thinkingLevel };
  }
  await shelleyPostJson(machine, `/api/conversation/${threadId}/chat`, body);
}

export async function cancelChat(machine: Machine, threadId: string): Promise<void> {
  await shelleyPostJson(machine, `/api/conversation/${threadId}/cancel`, {});
}
