import type { ChildProcess } from "node:child_process";
import type { ShelleyMessageRow } from "@domain/message";
import { liveStreamKind } from "@domain/streamDelta";
import { threadFromRow, type ShelleyConversationRow } from "@domain/thread";
import type { StreamEvent } from "@shared/ipc";
import type { Machine, Thread, ThreadId } from "@shared/types";
import { remoteCurlStream, spawnSshProcess } from "./ssh";

export type StreamInput =
  | StreamEvent
  | { kind: "message_rows"; threadId: ThreadId; rows: ShelleyMessageRow[] };

type StreamFrame = {
  conversation_id?: string;
  messages?: ShelleyMessageRow[];
  conversation?: ShelleyConversationRow;
  conversation_state?: { conversation_id: string; working: boolean; model?: string };
  stream_delta?: { type: string; text: string };
  heartbeat?: boolean;
};

export type StreamHandle = {
  stop: () => void;
};

export function openShelleyStream(
  machine: Machine,
  threadId: string,
  onEvent: (event: StreamInput) => void,
): StreamHandle {
  const path = `/api/stream2?conversation=${encodeURIComponent(threadId)}`;
  const child: ChildProcess = spawnSshProcess(machine.sshDest, remoteCurlStream(path), machine.identityFile);
  let stopped = false;
  let buffer = "";

  const emitThread = (row: ShelleyConversationRow): Thread => {
    return threadFromRow(row, machine.id);
  };

  child.stdout?.on("data", (chunk: Buffer) => {
    buffer += chunk.toString("utf8");
    const parts = buffer.split("\n");
    buffer = parts.pop() ?? "";
    for (const line of parts) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) {
        continue;
      }
      const jsonText = trimmed.slice("data:".length).trim();
      if (jsonText.length === 0) {
        continue;
      }
      let frame: StreamFrame;
      try {
        frame = JSON.parse(jsonText) as StreamFrame;
      } catch {
        continue;
      }
      if (frame.heartbeat) {
        continue;
      }
      const frameThreadId = frame.conversation_id ?? frame.conversation?.conversation_id ?? threadId;
      if (frame.messages && frame.messages.length > 0) {
        onEvent({
          kind: "message_rows",
          threadId: frameThreadId,
          rows: frame.messages,
        });
      }
      if (frame.conversation) {
        onEvent({ kind: "thread", thread: emitThread(frame.conversation) });
      }
      if (frame.conversation_state) {
        onEvent({
          kind: "working",
          threadId: frame.conversation_state.conversation_id,
          working: frame.conversation_state.working,
        });
      }
      const deltaKind = frame.stream_delta ? liveStreamKind(frame.stream_delta.type) : null;
      if (deltaKind && frame.stream_delta?.text) {
        onEvent({
          kind: "delta",
          threadId: frameThreadId,
          type: deltaKind,
          text: frame.stream_delta.text,
        });
      }
    }
  });

  child.stderr?.on("data", (chunk: Buffer) => {
    if (stopped) {
      return;
    }
    const text = chunk.toString("utf8").trim();
    if (text.length > 0) {
      onEvent({ kind: "error", message: `${machine.id} stream: ${text}` });
    }
  });

  child.on("close", (code) => {
    if (stopped) {
      return;
    }
    if (code && code !== 0) {
      onEvent({ kind: "error", message: `${machine.id} stream closed with ${code}` });
    }
  });

  return {
    stop: () => {
      stopped = true;
      child.kill("SIGTERM");
    },
  };
}
