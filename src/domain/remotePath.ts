export function normalizeDir(path: string): string {
  if (!path.startsWith("/") || path.includes("\0")) {
    throw new Error(`refusing remote path: ${path}`);
  }
  if (path === "/") {
    return "/";
  }
  return path.replace(/\/+$/, "");
}

export function parentDir(path: string): string | null {
  const dir = normalizeDir(path);
  if (dir === "/") {
    return null;
  }
  const slash = dir.lastIndexOf("/");
  if (slash <= 0) {
    return "/";
  }
  return dir.slice(0, slash);
}

export function folderName(path: string): string {
  const dir = normalizeDir(path);
  if (dir === "/") {
    return "/";
  }
  const slash = dir.lastIndexOf("/");
  return dir.slice(slash + 1);
}

export function joinDir(base: string, name: string): string {
  if (name.length === 0 || name === "." || name === ".." || name.includes("/") || name.includes("\0")) {
    throw new Error(`refusing folder name: ${name}`);
  }
  const dir = normalizeDir(base);
  if (dir === "/") {
    return `/${name}`;
  }
  return `${dir}/${name}`;
}
