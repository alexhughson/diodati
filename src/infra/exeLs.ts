import { firstErrorLine } from "@domain/exeConnect";
import { accountFromWhoami, uniqueRegisteredProbes, type ExeAccount } from "@domain/exeAccount";
import { exeNewArgs, machineFromNewJson, machinesFromLs, mergeAccountMachines, type ExeLsJson } from "@domain/machine";
import type { ExeAccountProbe, Machine } from "@shared/types";
import { discoverIdentityFiles } from "./sshKeys";
import { requireOk, runExeApi } from "./ssh";

export async function whoamiAccount(identityFile: string | null): Promise<ExeAccountProbe> {
  try {
    const result = await runExeApi(["whoami", "--json"], { identityFile });
    const stdout = requireOk(result, "ssh exe.dev whoami --json");
    const account = accountFromWhoami(stdout, identityFile);
    return { identityFile, email: account.email, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { identityFile, email: null, error: firstErrorLine(message) };
  }
}

export async function probeDiscoveredAccounts(): Promise<ExeAccountProbe[]> {
  const identities: Array<string | null> = [null];
  for (const file of discoverIdentityFiles()) {
    identities.push(file);
  }
  const tasks: Promise<ExeAccountProbe>[] = [];
  for (const identityFile of identities) {
    tasks.push(whoamiAccount(identityFile));
  }
  return uniqueRegisteredProbes(await Promise.all(tasks));
}

export async function listExeMachines(identityFiles: Array<string | null>): Promise<Machine[]> {
  if (identityFiles.length === 0) {
    throw new Error("no exe.dev accounts are active");
  }
  const tasks: Promise<Machine[] | { error: string }>[] = [];
  for (const identityFile of identityFiles) {
    tasks.push(listOneAccount(identityFile));
  }
  const results = await Promise.all(tasks);
  const groups: Machine[][] = [];
  const errors: string[] = [];
  for (const result of results) {
    if (Array.isArray(result)) {
      groups.push(result);
      continue;
    }
    errors.push(result.error);
  }
  if (groups.length === 0) {
    throw new Error(errors[0] ?? "ssh exe.dev ls --json returned no accounts");
  }
  return mergeAccountMachines(groups);
}

export async function createExeMachine(name: string | null, identityFile: string | null): Promise<Machine> {
  const account = await requireAccount(identityFile);
  const args = exeNewArgs(name);
  const result = await runExeApi(args, { timeoutMs: 180_000, identityFile });
  const stdout = requireOk(result, `ssh exe.dev ${args.join(" ")}`);
  return machineFromNewJson(stdout, account);
}

export async function exeMagicLoginUrl(identityFile: string | null): Promise<string> {
  const result = await runExeApi(["browser", "--json"], { identityFile });
  const stdout = requireOk(result, "ssh exe.dev browser --json");
  const payload = JSON.parse(stdout) as { magic_link?: string };
  if (!payload.magic_link) {
    throw new Error("exe.dev browser --json did not return magic_link");
  }
  return payload.magic_link;
}

async function requireAccount(identityFile: string | null): Promise<ExeAccount> {
  const result = await runExeApi(["whoami", "--json"], { identityFile });
  const stdout = requireOk(result, "ssh exe.dev whoami --json");
  return accountFromWhoami(stdout, identityFile);
}

async function listOneAccount(identityFile: string | null): Promise<Machine[] | { error: string }> {
  try {
    const whoamiTask = runExeApi(["whoami", "--json"], { identityFile });
    const lsTask = runExeApi(["ls", "--json"], { identityFile });
    const whoamiResult = await whoamiTask;
    const lsResult = await lsTask;
    const whoStdout = requireOk(whoamiResult, "ssh exe.dev whoami --json");
    const lsStdout = requireOk(lsResult, "ssh exe.dev ls --json");
    const account = accountFromWhoami(whoStdout, identityFile);
    const payload = JSON.parse(lsStdout) as ExeLsJson;
    return machinesFromLs(payload, account);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: message };
  }
}
