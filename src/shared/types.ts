export type MachineId = string;
export type ThreadId = string;
export type FolderId = string;

export type MachineOwnership = "owned" | "shared" | "team";

export type Machine = {
  id: MachineId;
  name: string;
  emoji: string;
  status: string;
  sshDest: string;
  httpsUrl: string;
  shelleyUrl: string;
  terminalUrl: string;
  proxyPort: number | null;
  ownership: MachineOwnership;
  canShell: boolean;
};

export type Folder = {
  id: FolderId;
  cwd: string | null;
  label: string;
};

export type Thread = {
  id: ThreadId;
  machineId: MachineId;
  slug: string | null;
  cwd: string | null;
  model: string | null;
  preview: string;
  updatedAt: string;
  isDraft: boolean;
  working: boolean;
};

export type FolderGroup = {
  folder: Folder;
  threads: Thread[];
};

export type MachineCatalog = {
  machine: Machine;
  groups: FolderGroup[];
  flattenFolders: boolean;
  loadError: string | null;
  homeDir: string | null;
};

export type ReasoningLevel = "off" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max";

export type Model = {
  id: string;
  displayName: string;
  source: string;
  ready: boolean;
  isDefault: boolean;
  tier: number;
  supportsReasoning: boolean;
  reasoningLevels: ReasoningLevel[];
  defaultReasoningLevel: ReasoningLevel | null;
};

export type ChatBlock =
  | { kind: "text"; text: string }
  | { kind: "thinking"; text: string }
  | {
      kind: "tool";
      id: string;
      name: string;
      inputText: string;
      outputText: string;
      running: boolean;
      errored: boolean;
    }
  | { kind: "error"; text: string }
  | { kind: "notice"; text: string };

export type ProjectedMessage = {
  id: string;
  sequenceId: number;
  type: string;
  role: "user" | "agent" | "other";
  createdAt: string;
  blocks: ChatBlock[];
};

export type ComposerOptions = {
  model: string;
  cwd: string | null;
  thinkingLevel: ReasoningLevel | null;
};

export type AppError = {
  message: string;
};
