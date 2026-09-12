import type { Machine, MachineCatalog, Model, ProjectedMessage, Thread } from "@shared/types";
import { exeVmName } from "./machine";

export const DEMO_SCENE = {
  machineId: "villa-diodati",
  threadId: "thd-beacon",
} as const;

const HOME = "/home/guest";
const DEMO_ACCOUNT_EMAIL = "demo@diodati.local";

function machine(partial: Machine): Machine {
  return partial;
}

function thread(partial: Thread): Thread {
  return partial;
}

export const demoMachines: Machine[] = [
  machine({
    id: "villa-diodati",
    name: "villa-diodati",
    emoji: "🏠",
    status: "running",
    sshDest: "villa-diodati.exe.xyz",
    httpsUrl: "https://villa-diodati.exe.xyz",
    ownership: "owned",
    canShell: true,
    accountEmail: DEMO_ACCOUNT_EMAIL,
    identityFile: null,
  }),
  machine({
    id: "mont-blanc",
    name: "mont-blanc",
    emoji: "⛰",
    status: "running",
    sshDest: "mont-blanc.exe.xyz",
    httpsUrl: "https://mont-blanc.exe.xyz",
    ownership: "owned",
    canShell: true,
    accountEmail: DEMO_ACCOUNT_EMAIL,
    identityFile: null,
  }),
  machine({
    id: "lake-geneva",
    name: "lake-geneva",
    emoji: "💧",
    status: "running",
    sshDest: "lake-geneva.exe.xyz",
    httpsUrl: "https://lake-geneva.exe.xyz",
    ownership: "shared",
    canShell: true,
    accountEmail: DEMO_ACCOUNT_EMAIL,
    identityFile: null,
  }),
];

export const demoThreads: Thread[] = [
  thread({
    id: "thd-beacon",
    machineId: "villa-diodati",
    slug: "watch-the-beacon",
    cwd: `${HOME}/lighthouse`,
    model: "claude-sonnet-4.5",
    preview: "last-seen.json is empty.",
    updatedAt: "2026-09-11T18:40:00Z",
    isDraft: false,
    working: false,
  }),
  thread({
    id: "thd-barometer",
    machineId: "villa-diodati",
    slug: "read-the-barometer-logs",
    cwd: `${HOME}/lighthouse`,
    model: "claude-sonnet-4.5",
    preview: "working",
    updatedAt: "2026-09-11T18:10:00Z",
    isDraft: false,
    working: true,
  }),
  thread({
    id: "thd-ottava",
    machineId: "villa-diodati",
    slug: "scan-the-ottava-rima",
    cwd: `${HOME}/sonnet`,
    model: "gpt-5.6-sol",
    preview: "Nine stanzas, all scanned.",
    updatedAt: "2026-09-11T16:20:00Z",
    isDraft: false,
    working: false,
  }),
  thread({
    id: "thd-cairn",
    machineId: "mont-blanc",
    slug: "list-the-summit-notes",
    cwd: `${HOME}/trail`,
    model: "claude-sonnet-4.5",
    preview: "Twelve notes, all present.",
    updatedAt: "2026-09-11T15:05:00Z",
    isDraft: false,
    working: false,
  }),
  thread({
    id: "thd-ferry",
    machineId: "lake-geneva",
    slug: "print-the-morning-list",
    cwd: `${HOME}/harbour`,
    model: "claude-sonnet-4.5",
    preview: "First boat still at 06:10.",
    updatedAt: "2026-09-11T14:00:00Z",
    isDraft: false,
    working: false,
  }),
];

export const demoModels: Model[] = [
  {
    id: "claude-sonnet-4.5",
    displayName: "Claude Sonnet 4.5",
    source: "anthropic",
    ready: true,
    isDefault: true,
    tier: 1,
    supportsReasoning: true,
    reasoningLevels: ["low", "medium", "high"],
    defaultReasoningLevel: "medium",
  },
  {
    id: "gpt-5.6-sol",
    displayName: "GPT-5.6 Sol",
    source: "openai",
    ready: true,
    isDefault: false,
    tier: 1,
    supportsReasoning: true,
    reasoningLevels: ["low", "medium", "high"],
    defaultReasoningLevel: "medium",
  },
];

const DEMO_NEW_NAMES = ["byron-cabin", "polidori-desk", "claire-studio"];

export function demoCatalogs(machines: Machine[] = demoMachines): MachineCatalog[] {
  return machines.map((item) => {
    return {
      machine: item,
      threads: demoThreads.filter((entry) => entry.machineId === item.id),
      loadError: null,
      homeDir: HOME,
    };
  });
}

export function createDemoMachine(name: string | null, existing: Machine[]): Machine {
  const id = name !== null && name.trim().length > 0 ? exeVmName(name) : nextDemoName(existing);
  if (existing.some((item) => item.id === id)) {
    throw new Error(`machine already listed: ${id}`);
  }
  return {
    id,
    name: id,
    emoji: "💻",
    status: "running",
    sshDest: `${id}.exe.xyz`,
    httpsUrl: `https://${id}.exe.xyz`,
    ownership: "owned",
    canShell: true,
    accountEmail: DEMO_ACCOUNT_EMAIL,
    identityFile: null,
  };
}

function nextDemoName(existing: Machine[]): string {
  const taken = new Set(existing.map((item) => item.id));
  for (const name of DEMO_NEW_NAMES) {
    if (!taken.has(name)) {
      return name;
    }
  }
  throw new Error("demo machine name list is exhausted");
}

export function demoMessages(threadId: string): ProjectedMessage[] {
  if (threadId !== DEMO_SCENE.threadId) {
    return [];
  }
  return [
    {
      id: "msg-user-1",
      sequenceId: 1,
      role: "user",
      createdAt: "2026-09-11T18:38:00Z",
      blocks: [{ kind: "text", text: "Look on my works, ye Mighty, and despair!" }],
    },
    {
      id: "msg-agent-1",
      sequenceId: 2,
      role: "agent",
      createdAt: "2026-09-11T18:38:20Z",
      blocks: [
        { kind: "thinking", text: "Read the README to see what this service does." },
        {
          kind: "tool",
          id: "tool-ls",
          name: "bash",
          inputText: "ls -1 && cat schedule.json",
          outputText: "README.md\ncmd/beacon/main.go\nschedule.json\nlast-seen.json\n{\n  \"dusk\": \"19:42\",\n  \"flash_after\": \"1h\"\n}",
          running: false,
          errored: false,
        },
        {
          kind: "text",
          text: "This folder holds a Go service that tracks todos and completed tasks, with several dimensions of priority.  `src/main.go` is the entrypoint.",
        },
      ],
    },
    {
      id: "msg-user-3",
      sequenceId: 3,
      role: "user",
      createdAt: "2026-09-11T18:39:00Z",
      blocks: [{ kind: "text", text: "and what is to be done next?"}]
    },
    {
      id: "msg-agent-3",
      sequenceId: 4,
      role: "agent",
      createdAt: "2026-09-11T18:39:20Z",
      blocks: [{ kind: "text", text: "There are many todos about statues, nothing is completed." }],
    },


  ];
}

export function demoThread(machineId: string, threadId: string): Thread {
  const found = demoThreads.find((item) => item.machineId === machineId && item.id === threadId);
  if (!found) {
    throw new Error(`unknown demo thread: ${machineId} ${threadId}`);
  }
  return found;
}

export function demoDirNames(dir: string): string[] {
  if (dir === HOME || dir === `${HOME}/`) {
    return ["harbour", "lighthouse", "sonnet", "trail"];
  }
  if (dir === `${HOME}/lighthouse`) {
    return ["cmd", "docs"];
  }
  return [];
}
