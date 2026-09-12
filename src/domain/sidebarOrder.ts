import type { MachineCatalog, MachineId } from "@shared/types";

export type SidebarSort = "recent" | "default" | "manual";

export function catalogRecency(catalog: MachineCatalog): string | null {
  let latest: string | null = null;
  for (const thread of catalog.threads) {
    if (latest === null || thread.updatedAt.localeCompare(latest) > 0) {
      latest = thread.updatedAt;
    }
  }
  return latest;
}

export function machineIds(catalogs: MachineCatalog[]): MachineId[] {
  const ids: MachineId[] = [];
  for (const catalog of catalogs) {
    ids.push(catalog.machine.id);
  }
  return ids;
}

export function sortCatalogs(
  catalogs: MachineCatalog[],
  sort: SidebarSort,
  manualOrder: MachineId[],
): MachineCatalog[] {
  if (sort === "manual") {
    return applyManualOrder(catalogs, manualOrder);
  }
  const next = [...catalogs];
  if (sort === "recent") {
    next.sort((left, right) => compareRecent(left, right));
    return next;
  }
  next.sort((left, right) => left.machine.name.localeCompare(right.machine.name));
  return next;
}

export function syncManualOrder(order: MachineId[], catalogs: MachineCatalog[]): MachineId[] {
  const known = new Set<MachineId>();
  for (const catalog of catalogs) {
    known.add(catalog.machine.id);
  }
  const next: MachineId[] = [];
  const seen = new Set<MachineId>();
  for (const id of order) {
    if (!known.has(id)) {
      continue;
    }
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    next.push(id);
  }
  const newcomers: MachineId[] = [];
  for (const catalog of catalogs) {
    if (seen.has(catalog.machine.id)) {
      continue;
    }
    newcomers.push(catalog.machine.id);
  }
  newcomers.sort((left, right) => left.localeCompare(right));
  for (const id of newcomers) {
    next.push(id);
  }
  return next;
}

export function moveManualOrder(order: MachineId[], sourceId: MachineId, targetId: MachineId): MachineId[] {
  if (sourceId === targetId) {
    return order;
  }
  const without: MachineId[] = [];
  for (const id of order) {
    if (id !== sourceId) {
      without.push(id);
    }
  }
  const insertAt = without.indexOf(targetId);
  if (insertAt < 0) {
    without.push(sourceId);
    return without;
  }
  const next: MachineId[] = [];
  for (let i = 0; i < without.length; i += 1) {
    if (i === insertAt) {
      next.push(sourceId);
    }
    const id = without[i];
    if (id) {
      next.push(id);
    }
  }
  return next;
}

function applyManualOrder(catalogs: MachineCatalog[], order: MachineId[]): MachineCatalog[] {
  const synced = syncManualOrder(order, catalogs);
  const byId = new Map<MachineId, MachineCatalog>();
  for (const catalog of catalogs) {
    byId.set(catalog.machine.id, catalog);
  }
  const next: MachineCatalog[] = [];
  for (const id of synced) {
    const catalog = byId.get(id);
    if (catalog) {
      next.push(catalog);
    }
  }
  return next;
}

function compareRecent(left: MachineCatalog, right: MachineCatalog): number {
  const leftAt = catalogRecency(left);
  const rightAt = catalogRecency(right);
  if (leftAt === null && rightAt === null) {
    return left.machine.name.localeCompare(right.machine.name);
  }
  if (leftAt === null) {
    return 1;
  }
  if (rightAt === null) {
    return -1;
  }
  const byTime = rightAt.localeCompare(leftAt);
  if (byTime !== 0) {
    return byTime;
  }
  return left.machine.name.localeCompare(right.machine.name);
}
