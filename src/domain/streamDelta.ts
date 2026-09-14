export type LiveStreamKind = "text" | "thinking";

export function liveStreamKind(type: string): LiveStreamKind | null {
  if (type === "text") {
    return "text";
  }
  if (type === "thinking") {
    return "thinking";
  }
  return null;
}
