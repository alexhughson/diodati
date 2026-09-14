import type { DiffLine, PatchView } from "@shared/types";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function stringField(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== "string") {
    return "";
  }
  return value;
}

function splitLines(text: string): string[] {
  if (text.length === 0) {
    return [];
  }
  const parts = text.split("\n");
  if (parts[parts.length - 1] === "") {
    parts.pop();
  }
  return parts;
}

function viewFrom(path: string, lines: DiffLine[]): PatchView {
  let added = 0;
  let deleted = 0;
  for (const line of lines) {
    if (line.kind === "add") {
      added += 1;
    }
    if (line.kind === "del") {
      deleted += 1;
    }
  }
  return { path, added, deleted, lines };
}

export function linesFromUnifiedDiff(diff: string): DiffLine[] {
  const raw = splitLines(diff);
  const lines: DiffLine[] = [];
  for (const line of raw) {
    if (
      line.startsWith("+++") ||
      line.startsWith("---") ||
      line.startsWith("@@") ||
      line.startsWith("diff ") ||
      line.startsWith("index ") ||
      line.startsWith("\\")
    ) {
      lines.push({ kind: "meta", text: line });
      continue;
    }
    if (line.startsWith("+")) {
      lines.push({ kind: "add", text: line });
      continue;
    }
    if (line.startsWith("-")) {
      lines.push({ kind: "del", text: line });
      continue;
    }
    lines.push({ kind: "ctx", text: line });
  }
  return lines;
}

export function linesFromOldNew(oldText: string, newText: string): DiffLine[] {
  const oldLines = splitLines(oldText);
  const newLines = splitLines(newText);
  let start = 0;
  while (start < oldLines.length && start < newLines.length && oldLines[start] === newLines[start]) {
    start += 1;
  }
  let oldEnd = oldLines.length;
  let newEnd = newLines.length;
  while (oldEnd > start && newEnd > start && oldLines[oldEnd - 1] === newLines[newEnd - 1]) {
    oldEnd -= 1;
    newEnd -= 1;
  }
  const lines: DiffLine[] = [];
  for (let index = 0; index < start; index += 1) {
    lines.push({ kind: "ctx", text: ` ${oldLines[index]}` });
  }
  for (let index = start; index < oldEnd; index += 1) {
    lines.push({ kind: "del", text: `-${oldLines[index]}` });
  }
  for (let index = start; index < newEnd; index += 1) {
    lines.push({ kind: "add", text: `+${newLines[index]}` });
  }
  for (let index = oldEnd; index < oldLines.length; index += 1) {
    lines.push({ kind: "ctx", text: ` ${oldLines[index]}` });
  }
  return lines;
}

export function patchFromDisplay(display: unknown): PatchView | null {
  const record = asRecord(display);
  if (!record) {
    return null;
  }
  const path = stringField(record, "path");
  const diff = stringField(record, "diff");
  if (diff.length > 0) {
    return viewFrom(path, linesFromUnifiedDiff(diff));
  }
  const oldContent = stringField(record, "oldContent");
  const newContent = stringField(record, "newContent");
  if (oldContent.length > 0 || newContent.length > 0) {
    return viewFrom(path, linesFromOldNew(oldContent, newContent));
  }
  if (path.length > 0) {
    return viewFrom(path, []);
  }
  return null;
}

export function patchFromInput(input: unknown): PatchView | null {
  const record = asRecord(input);
  if (!record) {
    return null;
  }
  const path = stringField(record, "path");
  if (path.length === 0) {
    return null;
  }
  const lines: DiffLine[] = [];
  const patches = record.patches;
  if (Array.isArray(patches)) {
    for (const item of patches) {
      const patch = asRecord(item);
      if (!patch) {
        continue;
      }
      const oldText = stringField(patch, "oldText");
      const newText = stringField(patch, "newText");
      const hunk = linesFromOldNew(oldText, newText);
      for (const line of hunk) {
        lines.push(line);
      }
    }
  }
  return viewFrom(path, lines);
}

export function patchViewForTool(name: string, input: unknown, display: unknown): PatchView | undefined {
  if (name.toLowerCase() !== "patch") {
    return undefined;
  }
  const fromDisplay = patchFromDisplay(display);
  if (fromDisplay) {
    return fromDisplay;
  }
  const fromInput = patchFromInput(input);
  if (fromInput) {
    return fromInput;
  }
  return undefined;
}

export function patchFileName(path: string): string {
  if (path.length === 0) {
    return "file";
  }
  const parts = path.split("/");
  const last = parts[parts.length - 1];
  if (!last) {
    return path;
  }
  return last;
}

export function patchSummary(patch: PatchView): string {
  const name = patchFileName(patch.path);
  if (patch.added === 0 && patch.deleted === 0) {
    return name;
  }
  if (patch.deleted === 0) {
    return `${name} +${patch.added}`;
  }
  if (patch.added === 0) {
    return `${name} -${patch.deleted}`;
  }
  return `${name} +${patch.added} -${patch.deleted}`;
}
