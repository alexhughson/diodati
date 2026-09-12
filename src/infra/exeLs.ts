import { exeNewArgs, machineFromNewJson, machinesFromLs, type ExeLsJson } from "@domain/machine";
import type { Machine } from "@shared/types";
import { requireOk, runExeApi } from "./ssh";

export async function listExeMachines(): Promise<Machine[]> {
  const result = await runExeApi(["ls", "--json"]);
  const stdout = requireOk(result, "ssh exe.dev ls --json");
  const payload = JSON.parse(stdout) as ExeLsJson;
  return machinesFromLs(payload);
}

export async function createExeMachine(name: string | null): Promise<Machine> {
  const args = exeNewArgs(name);
  const result = await runExeApi(args, { timeoutMs: 180_000 });
  const stdout = requireOk(result, `ssh exe.dev ${args.join(" ")}`);
  return machineFromNewJson(stdout);
}

export async function exeMagicLoginUrl(): Promise<string> {
  const result = await runExeApi(["browser", "--json"]);
  const stdout = requireOk(result, "ssh exe.dev browser --json");
  const payload = JSON.parse(stdout) as { magic_link?: string };
  if (!payload.magic_link) {
    throw new Error("exe.dev browser --json did not return magic_link");
  }
  return payload.magic_link;
}
