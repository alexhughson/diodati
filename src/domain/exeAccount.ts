import type { ExeAccountProbe, SshSettings } from "@shared/types";

export type ExeAccount = {
  identityFile: string | null;
  email: string;
};

export function accountFromWhoami(stdout: string, identityFile: string | null): ExeAccount {
  const payload = JSON.parse(stdout) as { email?: unknown };
  if (!payload || typeof payload !== "object" || typeof payload.email !== "string" || payload.email.trim().length === 0) {
    throw new Error("exe.dev whoami --json did not return email");
  }
  return { identityFile, email: payload.email.trim() };
}

export function exeIdentityArgs(identityFile: string | null): string[] {
  if (identityFile === null) {
    return [];
  }
  if (identityFile.trim().length === 0) {
    throw new Error("identity file path is empty");
  }
  return ["-o", "IdentitiesOnly=yes", "-o", "IdentityAgent=none", "-i", identityFile];
}

export function showAccountLabels(emails: string[]): boolean {
  const unique = new Set<string>();
  for (const email of emails) {
    unique.add(email);
  }
  return unique.size > 1;
}

export function parseSshSettings(raw: unknown): SshSettings {
  if (raw === null || raw === undefined) {
    return { activeIdentityKeys: ["default"] };
  }
  if (typeof raw !== "object") {
    throw new Error("ssh settings must be an object");
  }
  const record = raw as { activeIdentityKeys?: unknown; extraIdentityFiles?: unknown };
  if (record.activeIdentityKeys !== undefined) {
    return { activeIdentityKeys: parseIdentityKeys(record.activeIdentityKeys) };
  }
  if (record.extraIdentityFiles !== undefined) {
    const extras = parseIdentityKeys(record.extraIdentityFiles);
    const keys: string[] = ["default"];
    for (const extra of extras) {
      if (extra !== "default") {
        keys.push(extra);
      }
    }
    return { activeIdentityKeys: keys };
  }
  return { activeIdentityKeys: ["default"] };
}

export function identityFilesFromKeys(keys: string[]): Array<string | null> {
  const files: Array<string | null> = [];
  for (const key of keys) {
    if (key === "default") {
      files.push(null);
      continue;
    }
    files.push(key);
  }
  return files;
}

export function uniqueRegisteredProbes(probes: ExeAccountProbe[]): ExeAccountProbe[] {
  const byEmail = new Map<string, ExeAccountProbe>();
  for (const probe of probes) {
    if (!probe.email) {
      continue;
    }
    const existing = byEmail.get(probe.email);
    if (!existing) {
      byEmail.set(probe.email, probe);
      continue;
    }
    if (existing.identityFile !== null && probe.identityFile === null) {
      byEmail.set(probe.email, probe);
    }
  }
  const next: ExeAccountProbe[] = [];
  for (const probe of byEmail.values()) {
    next.push(probe);
  }
  next.sort((left, right) => {
    if (left.identityFile === null && right.identityFile !== null) {
      return -1;
    }
    if (left.identityFile !== null && right.identityFile === null) {
      return 1;
    }
    const leftEmail = left.email ?? "";
    const rightEmail = right.email ?? "";
    return leftEmail.localeCompare(rightEmail);
  });
  return next;
}

export function isDiscoverableSshKeyName(name: string): boolean {
  if (name.startsWith(".")) {
    return false;
  }
  if (name.endsWith(".pub")) {
    return false;
  }
  if (name.startsWith("known_hosts")) {
    return false;
  }
  if (name.startsWith("authorized_keys")) {
    return false;
  }
  if (name.startsWith("config")) {
    return false;
  }
  if (name === "environment" || name === "rc" || name === "exe-dev-config" || name === "exe-dev-known-hosts") {
    return false;
  }
  return true;
}

function parseIdentityKeys(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    throw new Error("identity keys must be an array");
  }
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (typeof item !== "string" || item.trim().length === 0) {
      throw new Error("identity key must be a non-empty string");
    }
    const key = item.trim();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    keys.push(key);
  }
  return keys;
}

export function identityKey(identityFile: string | null): string {
  if (identityFile === null) {
    return "default";
  }
  return identityFile;
}

export function probeFromAccount(account: ExeAccount): ExeAccountProbe {
  return { identityFile: account.identityFile, email: account.email, error: null };
}
