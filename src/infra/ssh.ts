import { folderName, normalizeDir } from "@domain/remotePath";
import { spawn } from "node:child_process";
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const CONTROL_PATH = "/tmp/diodati-%C";
const KNOWN_HOSTS = join(homedir(), ".ssh", "known_hosts");

export type SshResult = {
  stdout: string;
  stderr: string;
  code: number;
};

const DEST_PATTERN = /^[A-Za-z0-9._+-]+(@[A-Za-z0-9._-]+)?$/;

export function assertSshDest(dest: string): void {
  if (!DEST_PATTERN.test(dest)) {
    throw new Error(`refusing ssh dest: ${dest}`);
  }
}

export function hostFromDest(dest: string): string {
  const at = dest.lastIndexOf("@");
  if (at >= 0) {
    return dest.slice(at + 1);
  }
  return dest;
}

function quoteRemote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export async function listRemoteDirs(dest: string, dir: string): Promise<string[]> {
  const path = normalizeDir(dir);
  const result = await runSsh(dest, `find ${quoteRemote(path)} -mindepth 1 -maxdepth 1 -type d -print0`);
  const stdout = requireOk(result, `list dirs ${path} on ${dest}`);
  const names: string[] = [];
  for (const entry of stdout.split("\0")) {
    if (entry.length === 0) {
      continue;
    }
    names.push(folderName(entry));
  }
  names.sort((left, right) => left.localeCompare(right));
  return names;
}

export async function createRemoteDir(dest: string, dir: string): Promise<string> {
  const path = normalizeDir(dir);
  const result = await runSsh(dest, `mkdir -p -- ${quoteRemote(path)}`);
  requireOk(result, `create dir ${path} on ${dest}`);
  return path;
}

function sshBaseArgs(dest: string): string[] {
  assertSshDest(dest);
  return [
    "-o",
    "BatchMode=yes",
    "-o",
    "ConnectTimeout=20",
    "-o",
    "ControlMaster=auto",
    "-o",
    `ControlPath=${CONTROL_PATH}`,
    "-o",
    "ControlPersist=180",
    dest,
  ];
}

function readKnownHostLine(name: string): string | null {
  if (!existsSync(KNOWN_HOSTS)) {
    return null;
  }
  const text = readFileSync(KNOWN_HOSTS, "utf8");
  for (const line of text.split("\n")) {
    if (line.startsWith(`${name} `) || line.startsWith(`${name},`)) {
      return line;
    }
  }
  return null;
}

// exe.dev fronts every VM with one shared host key. A new vm_name is a new
// hostname, so OpenSSH rejects it until that same key is listed for the host.
export function ensureExeHostKnown(dest: string): void {
  const host = hostFromDest(dest);
  if (readKnownHostLine(host)) {
    return;
  }
  const exeLine = readKnownHostLine("exe.dev");
  if (!exeLine) {
    throw new Error("known_hosts has no exe.dev key; ssh to exe.dev once first");
  }
  const key = exeLine.slice("exe.dev ".length);
  appendFileSync(KNOWN_HOSTS, `${host} ${key}\n`);
}

export function runSsh(dest: string, remoteCommand: string, options?: { stdin?: string; timeoutMs?: number }): Promise<SshResult> {
  ensureExeHostKnown(dest);
  const args = [...sshBaseArgs(dest), remoteCommand];
  return spawnSsh(args, options);
}

export function runExeApi(apiArgs: string[]): Promise<SshResult> {
  ensureExeHostKnown("exe.dev");
  const args = [
    "-o",
    "BatchMode=yes",
    "-o",
    "ConnectTimeout=20",
    "exe.dev",
    ...apiArgs,
  ];
  return spawnSsh(args);
}

export function interactiveSshArgs(dest: string): string[] {
  assertSshDest(dest);
  return [
    "-o",
    "BatchMode=yes",
    "-o",
    "ConnectTimeout=20",
    "-o",
    "ControlMaster=no",
    "-tt",
    dest,
  ];
}

export function spawnSshProcess(dest: string, remoteCommand: string) {
  ensureExeHostKnown(dest);
  // A long-lived stream must not own the ControlMaster socket. Killing that
  // process would exit ssh with 255 and break later short commands.
  const args = [
    "-o",
    "BatchMode=yes",
    "-o",
    "ConnectTimeout=20",
    "-o",
    "ControlMaster=no",
    dest,
    remoteCommand,
  ];
  return spawn("ssh", args, { stdio: ["ignore", "pipe", "pipe"] });
}

function spawnSsh(args: string[], options?: { stdin?: string; timeoutMs?: number }): Promise<SshResult> {
  return new Promise((resolve, reject) => {
    const child = spawn("ssh", args, { stdio: ["pipe", "pipe", "pipe"] });
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    const timeoutMs = options?.timeoutMs ?? 30_000;
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`ssh timed out: ${args.join(" ")}`));
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdoutChunks.push(chunk as Buffer);
    });
    child.stderr.on("data", (chunk) => {
      stderrChunks.push(chunk as Buffer);
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({
        stdout: Buffer.concat(stdoutChunks).toString("utf8"),
        stderr: Buffer.concat(stderrChunks).toString("utf8"),
        code: code ?? 1,
      });
    });
    if (options?.stdin !== undefined) {
      child.stdin.write(options.stdin);
    }
    child.stdin.end();
  });
}

export function remoteCurlGet(path: string): string {
  return [
    "curl",
    "-sS",
    "-m",
    "30",
    "--unix-socket",
    '"$HOME/.config/shelley/shelley.sock"',
    "-H",
    quoteRemote("Accept-Encoding: identity"),
    quoteRemote(`http://localhost${path}`),
  ].join(" ");
}

export function remoteCurlPost(path: string): string {
  return [
    "curl",
    "-sS",
    "-m",
    "60",
    "--unix-socket",
    '"$HOME/.config/shelley/shelley.sock"',
    "-H",
    quoteRemote("Accept-Encoding: identity"),
    "-H",
    quoteRemote("Content-Type: application/json"),
    "-d",
    "@-",
    "-w",
    quoteRemote("\n%{http_code}"),
    quoteRemote(`http://localhost${path}`),
  ].join(" ");
}

export function remoteCurlStream(path: string): string {
  return [
    "curl",
    "-sN",
    "--unix-socket",
    '"$HOME/.config/shelley/shelley.sock"',
    "-H",
    quoteRemote("Accept-Encoding: identity"),
    "-H",
    quoteRemote("Accept: text/event-stream"),
    quoteRemote(`http://localhost${path}`),
  ].join(" ");
}

export function requireOk(result: SshResult, label: string): string {
  if (result.code !== 0) {
    const detail = result.stderr.trim() || result.stdout.trim() || `exit ${result.code}`;
    throw new Error(`${label}: ${detail}`);
  }
  return result.stdout;
}
