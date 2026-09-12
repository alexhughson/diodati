import type {
  ComposerOptions,
  Machine,
  MachineCatalog,
  MachineId,
  Model,
  ProjectedMessage,
  Thread,
  ThreadId,
} from "./types";

export type ThreadOpened = {
  thread: Thread;
  messages: ProjectedMessage[];
};

export type TerminalEvent =
  | { kind: "data"; machineId: string; data: string }
  | { kind: "exit"; machineId: string; code: number };

export type StreamEvent =
  | { kind: "messages"; threadId: ThreadId; messages: ProjectedMessage[] }
  | { kind: "delta"; threadId: ThreadId; text: string }
  | { kind: "working"; threadId: ThreadId; working: boolean }
  | { kind: "thread"; thread: Thread }
  | { kind: "error"; message: string };

export type IpcApi = {
  listMachines: () => Promise<Machine[]>;
  createMachine: (name: string | null) => Promise<Machine>;
  loadAllCatalogs: () => Promise<MachineCatalog[]>;
  listModels: (machineId: MachineId) => Promise<Model[]>;
  openThread: (machineId: MachineId, threadId: ThreadId) => Promise<ThreadOpened>;
  createDraft: (machineId: MachineId, options: ComposerOptions) => Promise<Thread>;
  sendChat: (machineId: MachineId, threadId: ThreadId, message: string, options: ComposerOptions) => Promise<void>;
  cancelChat: (machineId: MachineId, threadId: ThreadId) => Promise<void>;
  switchModel: (machineId: MachineId, threadId: ThreadId, options: ComposerOptions) => Promise<void>;
  openMagicLogin: () => Promise<string>;
  previewLoggedIn: () => Promise<boolean>;
  onPreviewAuth: (handler: (loggedIn: boolean) => void) => () => void;
  openTerminal: (machineId: MachineId, cols: number, rows: number) => Promise<void>;
  writeTerminal: (machineId: MachineId, data: string) => Promise<void>;
  resizeTerminal: (machineId: MachineId, cols: number, rows: number) => Promise<void>;
  closeTerminal: () => Promise<void>;
  onTerminal: (handler: (event: TerminalEvent) => void) => () => void;
  setPreviewUrl: (url: string) => Promise<void>;
  setPreviewBounds: (bounds: { x: number; y: number; width: number; height: number } | null) => Promise<void>;
  openExternal: (url: string) => Promise<void>;
  onStream: (handler: (event: StreamEvent) => void) => () => void;
  listRemoteDirs: (machineId: MachineId, dir: string) => Promise<string[]>;
  createRemoteDir: (machineId: MachineId, dir: string) => Promise<string>;
  demoScene: () => Promise<{ machineId: string; threadId: string } | null>;
  demoReady: () => Promise<void>;
};
