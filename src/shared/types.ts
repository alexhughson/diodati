export type MachineId = string;
export type ThreadId = string;

export type MachineOwnership = "owned" | "shared" | "team";

export type Machine = {
  id: MachineId;
  name: string;
  emoji: string;
  status: string;
  sshDest: string;
  httpsUrl: string;
  ownership: MachineOwnership;
  canShell: boolean;
  accountEmail: string;
  identityFile: string | null;
};

export type SshSettings = {
  activeIdentityKeys: string[];
};

export type ExeAccountProbe = {
  identityFile: string | null;
  email: string | null;
  error: string | null;
};

export type PreviewTarget = {
  url: string;
  accountEmail: string;
  identityFile: string | null;
  forceLogin?: boolean;
};

export type PreviewAuthEvent = {
  email: string;
  loggedIn: boolean;
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
  cwd: string | null;
  threads: Thread[];
};

export type MachineCatalog = {
  machine: Machine;
  threads: Thread[];
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

export type DiffLineKind = "add" | "del" | "ctx" | "meta";

export type DiffLine = {
  kind: DiffLineKind;
  text: string;
};

export type PatchView = {
  path: string;
  added: number;
  deleted: number;
  lines: DiffLine[];
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
      patch?: PatchView;
    }
  | { kind: "error"; text: string }
  | { kind: "notice"; text: string };

export type ProjectedMessage = {
  id: string;
  sequenceId: number;
  role: "user" | "agent" | "other";
  createdAt: string;
  blocks: ChatBlock[];
};

export type ComposerOptions = {
  model: string;
  cwd: string | null;
  thinkingLevel: ReasoningLevel | null;
};
