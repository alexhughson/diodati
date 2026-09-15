import type {
  ComposerOptions,
  ExeAccountProbe,
  Machine,
  MachineCatalog,
  MachineId,
  Model,
  PreviewAuthEvent,
  PreviewTarget,
  ProjectedMessage,
  SshSettings,
  Thread,
  ThreadId,
} from "./types";

export type ThreadOpened = {
  thread: Thread;
  messages: ProjectedMessage[];
  contextWindowSize: number;
};

export type TerminalEvent =
  | { kind: "data"; machineId: string; data: string }
  | { kind: "exit"; machineId: string; code: number };

export type StreamEvent =
  | { kind: "messages"; threadId: ThreadId; messages: ProjectedMessage[] }
  | { kind: "delta"; threadId: ThreadId; type: "text" | "thinking"; text: string }
  | { kind: "working"; threadId: ThreadId; working: boolean }
  | { kind: "thread"; thread: Thread }
  | { kind: "context"; threadId: ThreadId; tokens: number }
  | { kind: "error"; message: string };

export type IpcApi = {
  listMachines: () => Promise<Machine[]>;
  createMachine: (name: string | null, identityFile: string | null) => Promise<Machine>;
  getSshSettings: () => Promise<SshSettings>;
  setSshSettings: (settings: SshSettings) => Promise<SshSettings>;
  probeAccounts: () => Promise<ExeAccountProbe[]>;
  loadAllCatalogs: () => Promise<MachineCatalog[]>;
  listModels: (machineId: MachineId) => Promise<Model[]>;
  openThread: (machineId: MachineId, threadId: ThreadId) => Promise<ThreadOpened>;
  createDraft: (machineId: MachineId, options: ComposerOptions) => Promise<Thread>;
  sendChat: (machineId: MachineId, threadId: ThreadId, message: string, options: ComposerOptions) => Promise<void>;
  cancelChat: (machineId: MachineId, threadId: ThreadId) => Promise<void>;
  switchModel: (machineId: MachineId, threadId: ThreadId, options: ComposerOptions) => Promise<void>;
  startNewGeneration: (machineId: MachineId, threadId: ThreadId) => Promise<Thread>;
  previewLoggedIn: (accountEmail: string) => Promise<boolean>;
  onPreviewAuth: (handler: (event: PreviewAuthEvent) => void) => () => void;
  openTerminal: (machineId: MachineId, cols: number, rows: number) => Promise<void>;
  writeTerminal: (machineId: MachineId, data: string) => Promise<void>;
  resizeTerminal: (machineId: MachineId, cols: number, rows: number) => Promise<void>;
  closeTerminal: () => Promise<void>;
  onTerminal: (handler: (event: TerminalEvent) => void) => () => void;
  setPreviewUrl: (target: PreviewTarget) => Promise<void>;
  setPreviewBounds: (bounds: { x: number; y: number; width: number; height: number } | null) => Promise<void>;
  openExternal: (url: string) => Promise<void>;
  onStream: (handler: (event: StreamEvent) => void) => () => void;
  listRemoteDirs: (machineId: MachineId, dir: string) => Promise<string[]>;
  createRemoteDir: (machineId: MachineId, dir: string) => Promise<string>;
  demoScene: () => Promise<{ machineId: string; threadId: string } | null>;
  demoReady: () => Promise<void>;
};
