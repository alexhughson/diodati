import { parseSshSettings } from "@domain/exeAccount";
import type { SshSettings } from "@shared/types";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";

const FILE_NAME = "ssh-settings.json";

export function loadSshSettings(dir: string): SshSettings {
  const path = join(dir, FILE_NAME);
  if (!existsSync(path)) {
    return parseSshSettings({});
  }
  const raw = JSON.parse(readFileSync(path, "utf8")) as unknown;
  return parseSshSettings(raw);
}

export function saveSshSettings(dir: string, settings: SshSettings): SshSettings {
  const activeIdentityKeys: string[] = [];
  for (const key of settings.activeIdentityKeys) {
    if (key === "default") {
      activeIdentityKeys.push(key);
      continue;
    }
    activeIdentityKeys.push(requireExistingKeyFile(key));
  }
  const next = parseSshSettings({ activeIdentityKeys });
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, FILE_NAME), `${JSON.stringify(next, null, 2)}\n`);
  return next;
}

function requireExistingKeyFile(path: string): string {
  if (!isAbsolute(path)) {
    throw new Error("SSH key path must be absolute");
  }
  if (!existsSync(path)) {
    throw new Error(`SSH key not found: ${path}`);
  }
  if (!statSync(path).isFile()) {
    throw new Error(`SSH key is not a file: ${path}`);
  }
  return path;
}
