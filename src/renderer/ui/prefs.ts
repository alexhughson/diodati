export type TerminalDock = "bottom" | "right";

const DOCK_KEY = "exevibe.terminalDock";

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

const SIZE_KEY = "exevibe.layoutSizes";

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
