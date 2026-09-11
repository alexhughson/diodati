export type SlashCommand = {
  command: `/${string}`;
  description: string;
  takesArgs: boolean;
};

export const SLASH_COMMANDS: SlashCommand[] = [
  { command: "/model", description: "switches the model", takesArgs: true },
  { command: "/btw", description: "asks a one-off side question", takesArgs: true },
  { command: "/fork", description: "forks this conversation", takesArgs: false },
  { command: "/diff", description: "opens the diff viewer", takesArgs: false },
  { command: "/shell", description: "runs in shell", takesArgs: true },
  { command: "/compact", description: "compacts this conversation", takesArgs: true },
  { command: "/distill", description: "compacts this conversation", takesArgs: true },
  { command: "/clear", description: "clears context, keeping this conversation", takesArgs: false },
  { command: "/new", description: "starts a new conversation", takesArgs: true },
  { command: "/archive", description: "archives this conversation", takesArgs: false },
  { command: "/rename", description: "renames this conversation", takesArgs: true },
];

export function slashToken(text: string): string | null {
  const match = text.match(/^\/[a-zA-Z0-9_-]*$/);
  if (!match) {
    return null;
  }
  return match[0].slice(1).toLowerCase();
}

export function matchingSlashCommands(text: string): SlashCommand[] {
  const token = slashToken(text);
  if (token === null) {
    return [];
  }
  return SLASH_COMMANDS.filter((item) => item.command.slice(1).startsWith(token));
}

export function completeSlashCommand(command: SlashCommand): string {
  if (command.takesArgs) {
    return `${command.command} `;
  }
  return command.command;
}
