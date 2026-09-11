import { createRequire } from "node:module";
import type { IPty } from "node-pty";
import { ensureExeHostKnown, interactiveSshArgs } from "@infra/ssh";
import type { TerminalEvent } from "@shared/ipc";

const require = createRequire(import.meta.url);
const pty = require("node-pty") as typeof import("node-pty");

type Session = {
  dest: string;
  pty: IPty;
};

export class SshTerminal {
  private sessions = new Map<string, Session>();
  private silent = false;

  constructor(private emit: (event: TerminalEvent) => void) {}

  open(machineId: string, dest: string, cols: number, rows: number): void {
    ensureExeHostKnown(dest);
    const safeCols = Math.max(2, cols);
    const safeRows = Math.max(2, rows);
    const existing = this.sessions.get(machineId);
    if (existing) {
      existing.pty.resize(safeCols, safeRows);
      return;
    }
    const session = pty.spawn("ssh", interactiveSshArgs(dest), {
      name: "xterm-256color",
      cols: safeCols,
      rows: safeRows,
      env: { ...process.env, TERM: "xterm-256color" },
    });
    session.onData((data) => {
      if (this.silent) {
        return;
      }
      this.emit({ kind: "data", machineId, data });
    });
    session.onExit((info) => {
      this.sessions.delete(machineId);
      if (this.silent) {
        return;
      }
      this.emit({ kind: "exit", machineId, code: info.exitCode });
    });
    this.sessions.set(machineId, { dest, pty: session });
  }

  write(machineId: string, data: string): void {
    this.sessions.get(machineId)?.pty.write(data);
  }

  resize(machineId: string, cols: number, rows: number): void {
    this.sessions.get(machineId)?.pty.resize(Math.max(2, cols), Math.max(2, rows));
  }

  close(machineId: string): void {
    const session = this.sessions.get(machineId);
    if (!session) {
      return;
    }
    this.sessions.delete(machineId);
    session.pty.kill();
  }

  closeAll(): void {
    const ids = [...this.sessions.keys()];
    for (const machineId of ids) {
      this.close(machineId);
    }
  }

  dispose(): void {
    this.silent = true;
    this.closeAll();
  }
}
