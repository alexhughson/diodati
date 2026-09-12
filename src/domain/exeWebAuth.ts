export function cookieMeansExeWebLogin(cookie: { name: string; domain?: string }): boolean {
  const domain = cookie.domain;
  if (!domain) {
    return false;
  }
  const host = domain.startsWith(".") ? domain.slice(1) : domain;
  return cookie.name === "exe-auth" && host === "exe.dev";
}

export function previewPartition(accountEmail: string): string {
  const email = accountEmail.trim();
  if (email.length === 0) {
    throw new Error("preview account email is empty");
  }
  return `persist:diodati-preview:${email}`;
}
