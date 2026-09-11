import { describe, expect, test } from "bun:test";
import { cookieMeansExeWebLogin } from "./exeWebAuth";

// Rows from persist:diodati-preview Cookies on 2026-09-11.
describe("cookieMeansExeWebLogin", () => {
  test("exe-auth on exe.dev is web login", () => {
    expect(cookieMeansExeWebLogin({ name: "exe-auth", domain: "exe.dev" })).toBe(true);
    expect(cookieMeansExeWebLogin({ name: "exe-auth", domain: ".exe.dev" })).toBe(true);
  });

  test("per-vm login-with-exe cookie is not the account session", () => {
    expect(
      cookieMeansExeWebLogin({ name: "login-with-exe-443", domain: "alley-tablebase.exe.xyz" }),
    ).toBe(false);
  });
});
