export type ThemeId = "harbor" | "ember" | "cobalt" | "paper" | "bloom" | "pebble";

export type Theme = {
  id: ThemeId;
  label: string;
};

export const themes: Theme[] = [
  { id: "harbor", label: "Harbor" },
  { id: "ember", label: "Ember" },
  { id: "cobalt", label: "Cobalt" },
  { id: "paper", label: "Paper" },
  { id: "bloom", label: "Bloom" },
  { id: "pebble", label: "Pebble" },
];

const STORAGE_KEY = "diodati.theme";

function isThemeId(value: string): value is ThemeId {
  return themes.some((theme) => theme.id === value);
}

export function readTheme(): ThemeId {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw && isThemeId(raw)) {
    return raw;
  }
  return "paper";
}

export function writeTheme(id: ThemeId): void {
  window.localStorage.setItem(STORAGE_KEY, id);
}

export function readXtermTheme(el: HTMLElement) {
  const style = getComputedStyle(el);
  const value = (name: string) => style.getPropertyValue(name).trim();
  return {
    background: value("--bg-input"),
    foreground: value("--text"),
    cursor: value("--accent"),
    cursorAccent: value("--bg-input"),
    selectionBackground: value("--accent-dim"),
    selectionForeground: value("--text"),
    black: value("--term-black"),
    red: value("--term-red"),
    green: value("--term-green"),
    yellow: value("--term-yellow"),
    blue: value("--term-blue"),
    magenta: value("--term-magenta"),
    cyan: value("--term-cyan"),
    white: value("--term-white"),
    brightBlack: value("--term-bright-black"),
    brightRed: value("--term-bright-red"),
    brightGreen: value("--term-bright-green"),
    brightYellow: value("--term-bright-yellow"),
    brightBlue: value("--term-bright-blue"),
    brightMagenta: value("--term-bright-magenta"),
    brightCyan: value("--term-bright-cyan"),
    brightWhite: value("--term-bright-white"),
  };
}
