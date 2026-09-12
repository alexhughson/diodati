import type { SidebarSort } from "@domain/sidebarOrder";

export type { SidebarSort };

export type TerminalDock = "bottom" | "right";

const DOCK_KEY = "diodati.terminalDock";

export function readTerminalDock(): TerminalDock {
  const raw = window.localStorage.getItem(DOCK_KEY);
  if (raw === "right" || raw === "bottom") {
    return raw;
  }
  return "bottom";
}

export function writeTerminalDock(dock: TerminalDock): void {
  window.localStorage.setItem(DOCK_KEY, dock);
}

export type LayoutSizes = {
  sidebarWidth: number;
  previewWidth: number;
  terminalBottom: number;
  terminalRight: number;
};

const SIZE_KEY = "diodati.layoutSizes";

export const defaultLayoutSizes: LayoutSizes = {
  sidebarWidth: 248,
  previewWidth: 480,
  terminalBottom: 260,
  terminalRight: 420,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function readLayoutSizes(): LayoutSizes {
  const raw = window.localStorage.getItem(SIZE_KEY);
  if (!raw) {
    return defaultLayoutSizes;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<LayoutSizes>;
    return {
      sidebarWidth: clamp(Number(parsed.sidebarWidth) || defaultLayoutSizes.sidebarWidth, 160, 560),
      previewWidth: clamp(Number(parsed.previewWidth) || defaultLayoutSizes.previewWidth, 240, 1200),
      terminalBottom: clamp(Number(parsed.terminalBottom) || defaultLayoutSizes.terminalBottom, 140, 800),
      terminalRight: clamp(Number(parsed.terminalRight) || defaultLayoutSizes.terminalRight, 240, 1200),
    };
  } catch {
    return defaultLayoutSizes;
  }
}

export function writeLayoutSizes(sizes: LayoutSizes): void {
  window.localStorage.setItem(SIZE_KEY, JSON.stringify(sizes));
}

const SORT_KEY = "diodati.sidebarSort";
const ORDER_KEY = "diodati.sidebarOrder";

export function readSidebarSort(): SidebarSort {
  const raw = window.localStorage.getItem(SORT_KEY);
  if (raw === "recent" || raw === "default" || raw === "manual") {
    return raw;
  }
  return "manual";
}

export function writeSidebarSort(sort: SidebarSort): void {
  window.localStorage.setItem(SORT_KEY, sort);
}

export function readManualOrder(): string[] {
  return readIdList(ORDER_KEY);
}

export function writeManualOrder(order: string[]): void {
  window.localStorage.setItem(ORDER_KEY, JSON.stringify(order));
}

const COLLAPSED_KEY = "diodati.collapsedMachines";

export function readCollapsedMachines(): string[] {
  return readIdList(COLLAPSED_KEY);
}

export function writeCollapsedMachines(ids: string[]): void {
  window.localStorage.setItem(COLLAPSED_KEY, JSON.stringify(ids));
}

function readIdList(key: string): string[] {
  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    const ids: string[] = [];
    for (const item of parsed) {
      if (typeof item === "string" && item.length > 0) {
        ids.push(item);
      }
    }
    return ids;
  } catch {
    return [];
  }
}
