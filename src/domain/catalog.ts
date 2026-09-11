import type { FolderGroup, Machine, MachineCatalog, Thread } from "@shared/types";
import { displayFolder, folderFromCwd, folderIdFromCwd } from "./thread";

export function emptyCatalog(
  machine: Machine,
  loadError: string | null,
  homeDir: string | null = null,
): MachineCatalog {
  return {
    machine,
    groups: [],
    flattenFolders: true,
    loadError,
    homeDir,
  };
}

export function groupThreads(
  machine: Machine,
  threads: Thread[],
  homeDir: string | null = null,
): MachineCatalog {
  const byFolder = new Map<string, Thread[]>();
  for (const thread of threads) {
    const key = folderIdFromCwd(thread.cwd);
    const existing = byFolder.get(key);
    if (existing) {
      existing.push(thread);
    } else {
      byFolder.set(key, [thread]);
    }
  }

  const groups: FolderGroup[] = [];
  for (const [key, folderThreads] of byFolder.entries()) {
    const cwd = folderThreads[0]?.cwd ?? null;
    const sorted = [...folderThreads].sort((left, right) => {
      return right.updatedAt.localeCompare(left.updatedAt);
    });
    groups.push({
      folder: folderFromCwd(cwd),
      threads: sorted,
    });
    void key;
  }

  groups.sort((left, right) => left.folder.label.localeCompare(right.folder.label));

  return {
    machine,
    groups,
    flattenFolders: groups.length <= 1,
    loadError: null,
    homeDir,
  };
}

export function folderChoices(catalog: MachineCatalog): Array<{ cwd: string; label: string }> {
  const seen = new Set<string>();
  const choices: Array<{ cwd: string; label: string }> = [];
  const add = (cwd: string | null) => {
    if (!cwd || seen.has(cwd)) {
      return;
    }
    seen.add(cwd);
    choices.push({ cwd, label: displayFolder(cwd, catalog.homeDir) });
  };
  add(catalog.homeDir);
  for (const group of catalog.groups) {
    add(group.folder.cwd);
  }
  return choices;
}

export function upsertThread(catalog: MachineCatalog, thread: Thread): MachineCatalog {
  if (catalog.machine.id !== thread.machineId) {
    return catalog;
  }
  const targetId = folderIdFromCwd(thread.cwd);
  let found = false;
  const groups: FolderGroup[] = [];
  for (const group of catalog.groups) {
    const threads: Thread[] = [];
    for (const item of group.threads) {
      if (item.id === thread.id) {
        threads.push(thread);
        found = true;
      } else {
        threads.push(item);
      }
    }
    groups.push({ folder: group.folder, threads });
  }
  if (!found) {
    let placed = false;
    for (const group of groups) {
      if (group.folder.id === targetId) {
        group.threads.unshift(thread);
        placed = true;
        break;
      }
    }
    if (!placed) {
      groups.push({
        folder: folderFromCwd(thread.cwd),
        threads: [thread],
      });
    }
  }
  return {
    machine: catalog.machine,
    groups,
    flattenFolders: groups.length <= 1,
    loadError: catalog.loadError,
    homeDir: catalog.homeDir,
  };
}

export function upsertThreadInCatalogs(catalogs: MachineCatalog[], thread: Thread): MachineCatalog[] {
  return catalogs.map((catalog) => upsertThread(catalog, thread));
}
