import type { FolderGroup, Machine, MachineCatalog, Thread } from "@shared/types";
import { displayFolder, folderLabel } from "./thread";

export type FolderChoice = {
  cwd: string;
  label: string;
};

export function emptyCatalog(
  machine: Machine,
  loadError: string | null,
  homeDir: string | null = null,
): MachineCatalog {
  return {
    machine,
    threads: [],
    loadError,
    homeDir,
  };
}

export function groupThreads(threads: Thread[]): FolderGroup[] {
  const byFolder = new Map<string, Thread[]>();
  for (const thread of threads) {
    const key = thread.cwd ?? "";
    const existing = byFolder.get(key);
    if (existing) {
      existing.push(thread);
    } else {
      byFolder.set(key, [thread]);
    }
  }

  const groups: FolderGroup[] = [];
  for (const folderThreads of byFolder.values()) {
    const cwd = folderThreads[0]?.cwd ?? null;
    const sorted = [...folderThreads].sort((left, right) => {
      return right.updatedAt.localeCompare(left.updatedAt);
    });
    groups.push({ cwd, threads: sorted });
  }

  groups.sort((left, right) => folderLabel(left.cwd).localeCompare(folderLabel(right.cwd)));
  return groups;
}

export function folderChoices(catalog: MachineCatalog): FolderChoice[] {
  const seen = new Set<string>();
  const choices: FolderChoice[] = [];
  const add = (cwd: string | null) => {
    if (!cwd || seen.has(cwd)) {
      return;
    }
    seen.add(cwd);
    choices.push({ cwd, label: displayFolder(cwd, catalog.homeDir) });
  };
  add(catalog.homeDir);
  for (const thread of catalog.threads) {
    add(thread.cwd);
  }
  return choices;
}

export function replaceThread(threads: Thread[], thread: Thread): Thread[] {
  let found = false;
  const next: Thread[] = [];
  for (const item of threads) {
    if (item.id === thread.id) {
      next.push(thread);
      found = true;
    } else {
      next.push(item);
    }
  }
  if (!found) {
    return [thread, ...threads];
  }
  return next;
}

export function upsertThreadInCatalogs(catalogs: MachineCatalog[], thread: Thread): MachineCatalog[] {
  return catalogs.map((catalog) => {
    if (catalog.machine.id !== thread.machineId) {
      return catalog;
    }
    return { ...catalog, threads: replaceThread(catalog.threads, thread) };
  });
}

export function bumpCatalogWrite(seq: Record<string, number>, machineId: string): {
  seq: Record<string, number>;
  token: number;
} {
  const token = (seq[machineId] ?? 0) + 1;
  return { seq: { ...seq, [machineId]: token }, token };
}

export function isCurrentCatalogWrite(seq: Record<string, number>, machineId: string, token: number): boolean {
  return seq[machineId] === token;
}

export function replaceMachineCatalog(catalogs: MachineCatalog[], catalog: MachineCatalog): MachineCatalog[] {
  let found = false;
  const next: MachineCatalog[] = [];
  for (const item of catalogs) {
    if (item.machine.id !== catalog.machine.id) {
      next.push(item);
      continue;
    }
    found = true;
    next.push(catalog);
  }
  if (!found) {
    return catalogs;
  }
  return next;
}

export function replaceMachineThreads(
  catalogs: MachineCatalog[],
  machineId: string,
  threads: Thread[],
): MachineCatalog[] {
  return catalogs.map((catalog) => {
    if (catalog.machine.id !== machineId) {
      return catalog;
    }
    return { ...catalog, threads, loadError: null };
  });
}

export function mergePolledCatalogs(
  current: MachineCatalog[],
  polled: MachineCatalog[],
  started: Record<string, number>,
  latest: Record<string, number>,
): MachineCatalog[] {
  const polledById = new Map<string, MachineCatalog>();
  for (const catalog of polled) {
    polledById.set(catalog.machine.id, catalog);
  }
  return current.map((catalog) => {
    const id = catalog.machine.id;
    const token = started[id];
    if (token === undefined || latest[id] !== token) {
      return catalog;
    }
    return polledById.get(id) ?? catalog;
  });
}
