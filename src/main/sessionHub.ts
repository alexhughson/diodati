import { emptyCatalog } from "@domain/catalog";
import { projectMessages, type ShelleyMessageRow } from "@domain/message";
import { modelSwitchCommand } from "@domain/model";
import { requireMachine } from "@domain/machine";
import { exeMagicLoginUrl, listExeMachines } from "@infra/exeLs";
import { createRemoteDir, listRemoteDirs } from "@infra/ssh";
import {
  cancelChat,
  createDraft,
  listMachineModels,
  listMachineThreads,
  machineHomeDir,
  loadThreadMessages,
  sendChat,
} from "@infra/shelleyRemote";
import { openShelleyStream, type StreamHandle } from "@infra/shelleyStream";
import type { StreamEvent, ThreadOpened } from "@shared/ipc";
import type { ComposerOptions, Machine, MachineCatalog, MachineId, Model, ProjectedMessage, Thread, ThreadId } from "@shared/types";

export class SessionHub {
  private machines: Machine[] = [];
  private stream: StreamHandle | null = null;
  private streamThreadId: ThreadId | null = null;
  private rows = new Map<string, ShelleyMessageRow>();
  private rowsThreadId: ThreadId | null = null;
  private emit: (event: StreamEvent) => void;

  constructor(emit: (event: StreamEvent) => void) {
    this.emit = emit;
  }

  async listMachines(): Promise<Machine[]> {
    this.machines = await listExeMachines();
    return this.machines;
  }

  async loadAllCatalogs(): Promise<MachineCatalog[]> {
    return Promise.all(this.machines.map((machine) => this.loadCatalogFor(machine)));
  }

  async listModels(machineId: MachineId): Promise<Model[]> {
    return listMachineModels(this.machine(machineId));
  }

  async openThread(machineId: MachineId, threadId: ThreadId): Promise<ThreadOpened> {
    const machine = this.machine(machineId);
    const opened = await loadThreadMessages(machine, threadId);
    const messages = this.replaceRows(threadId, opened.rows);
    this.replaceStream(machine, threadId);
    return { thread: opened.thread, messages };
  }

  async createDraft(machineId: MachineId, options: ComposerOptions): Promise<Thread> {
    return createDraft(this.machine(machineId), options);
  }

  async sendChat(machineId: MachineId, threadId: ThreadId, message: string, options: ComposerOptions): Promise<void> {
    const machine = this.machine(machineId);
    if (this.streamThreadId !== threadId) {
      this.replaceStream(machine, threadId);
    }
    await sendChat(machine, threadId, message, options);
  }

  async cancelChat(machineId: MachineId, threadId: ThreadId): Promise<void> {
    await cancelChat(this.machine(machineId), threadId);
  }

  async switchModel(machineId: MachineId, threadId: ThreadId, options: ComposerOptions): Promise<void> {
    const command = modelSwitchCommand(options.model, options.thinkingLevel);
    await this.sendChat(machineId, threadId, command, options);
  }

  async magicLogin(): Promise<string> {
    return exeMagicLoginUrl();
  }

  sshDest(machineId: MachineId): string {
    return this.machine(machineId).sshDest;
  }

  async listDirs(machineId: MachineId, dir: string): Promise<string[]> {
    return listRemoteDirs(this.sshDest(machineId), dir);
  }

  async createDir(machineId: MachineId, dir: string): Promise<string> {
    return createRemoteDir(this.sshDest(machineId), dir);
  }

  stop(): void {
    if (this.stream) {
      this.stream.stop();
      this.stream = null;
      this.streamThreadId = null;
    }
    this.rows.clear();
    this.rowsThreadId = null;
  }

  private machine(machineId: MachineId): Machine {
    return requireMachine(this.machines, machineId);
  }

  private async loadCatalogFor(machine: Machine): Promise<MachineCatalog> {
    if (!machine.canShell) {
      return emptyCatalog(machine, "no shell access");
    }
    try {
      const homeDir = await machineHomeDir(machine);
      const threads = await listMachineThreads(machine);
      return { machine, threads, loadError: null, homeDir };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return emptyCatalog(machine, message);
    }
  }

  private replaceRows(threadId: ThreadId, rows: ShelleyMessageRow[]): ProjectedMessage[] {
    this.rows = new Map();
    this.rowsThreadId = threadId;
    return this.ingestRows(threadId, rows);
  }

  private ingestRows(threadId: ThreadId, rows: ShelleyMessageRow[]): ProjectedMessage[] {
    if (this.rowsThreadId !== threadId) {
      this.rows = new Map();
      this.rowsThreadId = threadId;
    }
    for (const row of rows) {
      this.rows.set(row.message_id, row);
    }
    const ordered = [...this.rows.values()].sort((left, right) => left.sequence_id - right.sequence_id);
    return projectMessages(ordered);
  }

  private replaceStream(machine: Machine, threadId: ThreadId): void {
    if (this.stream) {
      this.stream.stop();
    }
    this.stream = openShelleyStream(machine, threadId, (event) => {
      if (event.kind === "message_rows") {
        this.emit({
          kind: "messages",
          threadId: event.threadId,
          messages: this.ingestRows(event.threadId, event.rows),
        });
        return;
      }
      this.emit(event);
    });
    this.streamThreadId = threadId;
  }
}
