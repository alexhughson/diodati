import type { ChatBlock, ProjectedMessage } from "@shared/types";

export type ShelleyMessageRow = {
  message_id: string;
  conversation_id: string;
  sequence_id: number;
  type: string;
  llm_data?: string | null;
  user_data?: string | null;
  created_at: string;
};

// Go const block in shelley/llm: MessageRole uses 0-1, then ContentType continues.
const CONTENT_TEXT = 2;
const CONTENT_THINKING = 3;
const CONTENT_TOOL_USE = 5;
const CONTENT_TOOL_RESULT = 6;
const CONTENT_SERVER_TOOL = 7;
const CONTENT_WEB_SEARCH_RESULT = 8;

type LlmContent = {
  Type?: number;
  Text?: string;
  Thinking?: string;
  ToolName?: string;
  ToolInput?: unknown;
  ToolUseID?: string;
  ID?: string;
  ToolResult?: LlmContent[];
  ToolError?: boolean;
  Display?: unknown;
};

type ToolResult = {
  text: string;
  errored: boolean;
};

type LlmMessage = {
  Content?: LlmContent[];
};

function parseJson(raw: string | null | undefined): unknown {
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function textFromUnknown(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (value === null || value === undefined) {
    return "";
  }
  return JSON.stringify(value, null, 2);
}

function toolResultText(contents: LlmContent[] | undefined): string {
  if (!contents) {
    return "";
  }
  const parts: string[] = [];
  for (const content of contents) {
    if (content.Text) {
      parts.push(content.Text);
    }
  }
  return parts.join("\n");
}

function toolResultFromContent(content: LlmContent): ToolResult {
  const fromBlocks = toolResultText(content.ToolResult);
  if (fromBlocks.length > 0) {
    return { text: fromBlocks, errored: content.ToolError === true };
  }
  if (content.Text && content.Text.length > 0) {
    return { text: content.Text, errored: content.ToolError === true };
  }
  if (content.Display !== undefined && content.Display !== null) {
    return { text: textFromUnknown(content.Display), errored: content.ToolError === true };
  }
  return { text: "", errored: content.ToolError === true };
}

function collectToolResults(rows: ShelleyMessageRow[]): Map<string, ToolResult> {
  const results = new Map<string, ToolResult>();
  for (const row of rows) {
    const llmRaw = parseJson(row.llm_data);
    const llm = asRecord(llmRaw) as LlmMessage | null;
    for (const content of llm?.Content ?? []) {
      if (content.Type !== CONTENT_TOOL_RESULT && content.Type !== CONTENT_WEB_SEARCH_RESULT) {
        continue;
      }
      const toolId = content.ToolUseID;
      if (!toolId) {
        continue;
      }
      results.set(toolId, toolResultFromContent(content));
    }
  }
  return results;
}

function toolIsInFlight(
  hasResult: boolean,
  rowSequence: number,
  lastSequence: number,
  contents: LlmContent[],
  index: number,
): boolean {
  if (hasResult) {
    return false;
  }
  if (rowSequence !== lastSequence) {
    return false;
  }
  let next = index + 1;
  while (next < contents.length) {
    const later = contents[next];
    if (later.Type === CONTENT_TEXT && later.Text) {
      return false;
    }
    next += 1;
  }
  return true;
}

function userText(row: ShelleyMessageRow, llm: LlmMessage | null): string {
  const user = asRecord(parseJson(row.user_data));
  if (user) {
    const direct = user.text ?? user.message ?? user.content;
    if (typeof direct === "string" && direct.length > 0) {
      return direct;
    }
  }
  if (llm?.Content) {
    const parts: string[] = [];
    for (const content of llm.Content) {
      if (content.Type === CONTENT_TEXT && content.Text) {
        parts.push(content.Text);
      }
    }
    if (parts.length > 0) {
      return parts.join("");
    }
  }
  return "";
}

function noticeText(row: ShelleyMessageRow): string {
  const user = asRecord(parseJson(row.user_data));
  if (!user) {
    return row.type;
  }
  const message = user.message ?? user.text ?? user.slug ?? user.model;
  if (typeof message === "string" && message.length > 0) {
    return message;
  }
  return JSON.stringify(user);
}

function stringField(user: Record<string, unknown> | null, key: string): string {
  if (!user) {
    return "";
  }
  const value = user[key];
  if (typeof value !== "string") {
    return "";
  }
  return value;
}

function distillStatus(row: ShelleyMessageRow): string | null {
  const user = asRecord(parseJson(row.user_data));
  const status = stringField(user, "distill_status");
  if (status.length === 0) {
    return null;
  }
  return status;
}

function distillKey(row: ShelleyMessageRow): string {
  const user = asRecord(parseJson(row.user_data));
  const slug = stringField(user, "source_slug");
  const generation = stringField(user, "new_generation");
  return `${slug}\0${generation}`;
}

function distillNoticeText(row: ShelleyMessageRow): string | null {
  const status = distillStatus(row);
  if (status === null) {
    return null;
  }
  const user = asRecord(parseJson(row.user_data));
  const compact = stringField(user, "distill_method") === "compact";
  const slug = stringField(user, "source_slug");
  const gerund = compact ? "Compacting" : "Distilling";
  const past = compact ? "Compacted" : "Distilled";
  const noun = compact ? "Compaction" : "Distillation";
  if (status === "in_progress") {
    if (slug.length > 0) {
      return `${gerund} conversation "${slug}"…`;
    }
    return `${gerund} conversation…`;
  }
  if (status === "complete") {
    if (slug.length > 0) {
      return `${past} from "${slug}"`;
    }
    return `${past} from prior conversation`;
  }
  if (status === "error") {
    if (slug.length > 0) {
      return `${noun} failed for "${slug}"`;
    }
    return `${noun} failed`;
  }
  return `${noun} ${status}`;
}

function supersededDistillInProgress(rows: ShelleyMessageRow[]): Set<string> {
  const lastInProgress = new Map<string, string>();
  const hidden = new Set<string>();
  for (const row of rows) {
    const status = distillStatus(row);
    if (status === null) {
      continue;
    }
    const key = distillKey(row);
    if (status === "in_progress") {
      lastInProgress.set(key, row.message_id);
      continue;
    }
    const prior = lastInProgress.get(key);
    if (prior) {
      hidden.add(prior);
      lastInProgress.delete(key);
    }
  }
  return hidden;
}

export function projectMessage(
  row: ShelleyMessageRow,
  toolResults?: Map<string, ToolResult>,
  lastSequenceId?: number,
): ProjectedMessage {
  const llmRaw = parseJson(row.llm_data);
  const llm = asRecord(llmRaw) as LlmMessage | null;
  const results = toolResults ?? collectToolResults([row]);
  const lastSequence = lastSequenceId ?? row.sequence_id;
  const blocks: ChatBlock[] = [];
  let role: ProjectedMessage["role"] = "other";
  const distill = distillNoticeText(row);
  if (distill) {
    blocks.push({ kind: "notice", text: distill });
    return {
      id: row.message_id,
      sequenceId: row.sequence_id,
      role,
      createdAt: row.created_at,
      blocks,
    };
  }

  if (row.type === "user") {
    role = "user";
    const text = userText(row, llm);
    if (text.length > 0) {
      blocks.push({ kind: "text", text });
    }
  } else if (row.type === "agent") {
    role = "agent";
    const contents = llm?.Content ?? [];
    let index = 0;
    while (index < contents.length) {
      const content = contents[index];
      if (content.Type === CONTENT_TEXT && content.Text) {
        blocks.push({ kind: "text", text: content.Text });
      } else if (content.Type === CONTENT_THINKING) {
        const thinking = content.Thinking || content.Text || "";
        if (thinking.length > 0) {
          blocks.push({ kind: "thinking", text: thinking });
        }
      } else if (content.Type === CONTENT_TOOL_USE || content.Type === CONTENT_SERVER_TOOL) {
        const toolId = content.ID ?? "";
        const result = results.get(toolId);
        blocks.push({
          kind: "tool",
          id: toolId,
          name: content.ToolName ?? "tool",
          inputText: textFromUnknown(content.ToolInput),
          outputText: result?.text ?? "",
          running: toolIsInFlight(Boolean(result), row.sequence_id, lastSequence, contents, index),
          errored: result?.errored === true,
        });
      }
      index += 1;
    }
  } else if (row.type === "error") {
    blocks.push({ kind: "error", text: noticeText(row) });
  } else if (row.type === "slug") {
    blocks.push({ kind: "notice", text: `named ${noticeText(row)}` });
  } else if (row.type === "modelchange") {
    blocks.push({ kind: "notice", text: `model ${noticeText(row)}` });
  } else if (row.type === "warning") {
    blocks.push({ kind: "notice", text: noticeText(row) });
  }

  return {
    id: row.message_id,
    sequenceId: row.sequence_id,
    role,
    createdAt: row.created_at,
    blocks,
  };
}

export function projectMessages(rows: ShelleyMessageRow[]): ProjectedMessage[] {
  const ordered = [...rows].sort((left, right) => left.sequence_id - right.sequence_id);
  const lastSequence = ordered[ordered.length - 1]?.sequence_id ?? 0;
  const toolResults = collectToolResults(ordered);
  const hiddenDistill = supersededDistillInProgress(ordered);
  const projected: ProjectedMessage[] = [];
  for (const row of ordered) {
    if (hiddenDistill.has(row.message_id)) {
      continue;
    }
    const message = projectMessage(row, toolResults, lastSequence);
    if (message.blocks.length === 0) {
      continue;
    }
    projected.push(message);
  }
  return projected;
}

export type ToolBlock = Extract<ChatBlock, { kind: "tool" }>;

export type MessageSegment =
  | { kind: "lone"; block: ChatBlock }
  | { kind: "tools"; tools: ToolBlock[] };

export type MessageLayout =
  | { kind: "prose"; blocks: ChatBlock[] }
  | { kind: "tools"; tools: ToolBlock[] }
  | { kind: "thinking"; text: string }
  | { kind: "notice"; text: string };

export function layoutMessage(blocks: ChatBlock[]): MessageLayout[] {
  const layouts: MessageLayout[] = [];
  const prose: ChatBlock[] = [];
  const thoughts: string[] = [];
  const flushProse = () => {
    if (prose.length === 0) {
      return;
    }
    layouts.push({ kind: "prose", blocks: [...prose] });
    prose.length = 0;
  };
  const flushThoughts = () => {
    if (thoughts.length === 0) {
      return;
    }
    layouts.push({ kind: "thinking", text: thoughts.join("\n\n") });
    thoughts.length = 0;
  };
  const segments = segmentBlocks(blocks);
  for (const segment of segments) {
    if (segment.kind === "tools") {
      flushProse();
      flushThoughts();
      layouts.push({ kind: "tools", tools: segment.tools });
      continue;
    }
    if (segment.block.kind === "tool") {
      flushProse();
      flushThoughts();
      layouts.push({ kind: "tools", tools: [segment.block] });
      continue;
    }
    if (segment.block.kind === "thinking") {
      flushProse();
      thoughts.push(segment.block.text);
      continue;
    }
    if (segment.block.kind === "notice") {
      flushProse();
      flushThoughts();
      layouts.push({ kind: "notice", text: segment.block.text });
      continue;
    }
    flushThoughts();
    prose.push(segment.block);
  }
  flushThoughts();
  flushProse();
  return layouts;
}

export function segmentBlocks(blocks: ChatBlock[]): MessageSegment[] {
  const segments: MessageSegment[] = [];
  let index = 0;
  while (index < blocks.length) {
    const block = blocks[index];
    if (block.kind !== "tool") {
      segments.push({ kind: "lone", block });
      index += 1;
      continue;
    }
    const tools: ToolBlock[] = [];
    while (index < blocks.length && blocks[index].kind === "tool") {
      tools.push(blocks[index] as ToolBlock);
      index += 1;
    }
    if (tools.length === 1) {
      segments.push({ kind: "lone", block: tools[0] });
    } else {
      segments.push({ kind: "tools", tools });
    }
  }
  return segments;
}

