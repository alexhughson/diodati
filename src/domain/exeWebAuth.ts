export function cookieMeansExeWebLogin(cookie: { name: string; domain: string }): boolean {
  const host = cookie.domain.startsWith(".") ? cookie.domain.slice(1) : cookie.domain;
  return cookie.name === "exe-auth" && host === "exe.dev";
}
