import type { Model, ReasoningLevel } from "@shared/types";

export type ShelleyModelRow = {
  id: string;
  display_name?: string;
  source?: string;
  ready: boolean;
  is_default?: boolean;
  tier?: number;
  supports_reasoning?: boolean;
  reasoning_levels?: string[];
  default_reasoning_level?: string;
  max_context_tokens?: number;
};

const LEVELS = new Set<ReasoningLevel>(["off", "minimal", "low", "medium", "high", "xhigh", "max"]);

export function parseReasoningLevel(value: string | undefined): ReasoningLevel | null {
  if (!value) {
    return null;
  }
  if (LEVELS.has(value as ReasoningLevel)) {
    return value as ReasoningLevel;
  }
  return null;
}

export function modelFromRow(row: ShelleyModelRow): Model {
  if (!row.id) {
    throw new Error("model row is missing id");
  }
  const reasoningLevels: ReasoningLevel[] = [];
  for (const level of row.reasoning_levels ?? []) {
    const parsed = parseReasoningLevel(level);
    if (parsed) {
      reasoningLevels.push(parsed);
    }
  }
  return {
    id: row.id,
    displayName: row.display_name ?? row.id,
    source: row.source ?? "",
    ready: row.ready,
    isDefault: row.is_default === true,
    tier: row.tier ?? 1,
    supportsReasoning: row.supports_reasoning === true,
    reasoningLevels,
    defaultReasoningLevel: parseReasoningLevel(row.default_reasoning_level),
    maxContextTokens: row.max_context_tokens ?? 0,
  };
}

export function modelsFromRows(rows: ShelleyModelRow[]): Model[] {
  const ready = rows.filter((row) => row.ready).map(modelFromRow);
  ready.sort((left, right) => {
    if (left.tier !== right.tier) {
      return left.tier - right.tier;
    }
    if (left.isDefault !== right.isDefault) {
      return left.isDefault ? -1 : 1;
    }
    return left.displayName.localeCompare(right.displayName);
  });
  return ready;
}

export function defaultModel(models: Model[]): Model | null {
  const marked = models.find((model) => model.isDefault);
  if (marked) {
    return marked;
  }
  return models[0] ?? null;
}

export function modelOnList(models: Model[], modelId: string): Model | null {
  for (const model of models) {
    if (model.id === modelId) {
      return model;
    }
  }
  return null;
}

export function pickModelOnList(models: Model[], preferredId: string): Model | null {
  const preferred = modelOnList(models, preferredId);
  if (preferred) {
    return preferred;
  }
  return defaultModel(models);
}

export function modelSwitchCommand(modelId: string, thinkingLevel: ReasoningLevel | null): string {
  if (thinkingLevel) {
    return `/model ${modelId} ${thinkingLevel}`;
  }
  return `/model ${modelId}`;
}
