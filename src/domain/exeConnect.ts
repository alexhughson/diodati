export type ExeConnectKind = "needs-key" | "other";

export function firstErrorLine(message: string): string {
  const first = message.split("\n")[0] ?? message;
  const marker = ": Error: ";
  if (first.startsWith("Error invoking remote method ") && first.includes(marker)) {
    return first.slice(first.lastIndexOf(marker) + marker.length);
  }
  return first;
}

export function classifyExeConnectError(message: string): ExeConnectKind {
  const text = message.toLowerCase();
  if (text.includes("permission denied")) {
    return "needs-key";
  }
  if (text.includes("publickey")) {
    return "needs-key";
  }
  if (text.includes("too many authentication")) {
    return "needs-key";
  }
  if (text.includes("no such identity")) {
    return "needs-key";
  }
  if (text.includes("known_hosts has no exe.dev")) {
    return "needs-key";
  }
  if (text.includes("host key verification failed")) {
    return "needs-key";
  }
  if (text.includes("register")) {
    return "needs-key";
  }
  return "other";
}
