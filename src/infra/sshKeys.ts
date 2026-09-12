import { isDiscoverableSshKeyName } from "@domain/exeAccount";
import { existsSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export function discoverIdentityFiles(sshDir = join(homedir(), ".ssh")): string[] {
  if (!existsSync(sshDir) || !statSync(sshDir).isDirectory()) {
    return [];
  }
  const names = readdirSync(sshDir);
  const files: string[] = [];
  for (const name of names) {
    if (!isDiscoverableSshKeyName(name)) {
      continue;
    }
    const path = join(sshDir, name);
    if (!statSync(path).isFile()) {
      continue;
    }
    files.push(path);
  }
  files.sort((left, right) => left.localeCompare(right));
  return files;
}
