import { expect, test } from "bun:test";
import {
  accountFromWhoami,
  exeIdentityArgs,
  isDiscoverableSshKeyName,
  parseSshSettings,
  showAccountLabels,
  uniqueRegisteredProbes,
} from "./exeAccount";

test("accountFromWhoami reads the email and keeps the identity file", () => {
  const stdout = JSON.stringify({
    email: "alex@getjevy.com",
    region: "nyc",
    ssh_keys: [{ name: "alex@Alexs-MBP.lan", current: true }],
  });
  const account = accountFromWhoami(stdout, null);
  expect(account.email).toBe("alex@getjevy.com");
  expect(account.identityFile).toBeNull();
});

test("accountFromWhoami throws when email is missing", () => {
  expect(() => accountFromWhoami(JSON.stringify({ region: "nyc" }), null)).toThrow("email");
});

test("exeIdentityArgs is empty for the default key", () => {
  expect(exeIdentityArgs(null)).toEqual([]);
});

test("exeIdentityArgs pins an extra key", () => {
  expect(exeIdentityArgs("/Users/alex/.ssh/id_exe")).toEqual([
    "-o",
    "IdentitiesOnly=yes",
    "-o",
    "IdentityAgent=none",
    "-i",
    "/Users/alex/.ssh/id_exe",
  ]);
});

test("showAccountLabels is false for one email", () => {
  expect(showAccountLabels(["alex@getjevy.com", "alex@getjevy.com"])).toBe(false);
});

test("showAccountLabels is true for two emails", () => {
  expect(showAccountLabels(["alex@getjevy.com", "alex@alexhughson.com"])).toBe(true);
});

test("parseSshSettings defaults to the default SSH identity", () => {
  expect(parseSshSettings({})).toEqual({ activeIdentityKeys: ["default"] });
});

test("parseSshSettings migrates extraIdentityFiles onto the default key", () => {
  const settings = parseSshSettings({
    extraIdentityFiles: ["/Users/alex/.ssh/id_exe", "/Users/alex/.ssh/id_exe"],
  });
  expect(settings.activeIdentityKeys).toEqual(["default", "/Users/alex/.ssh/id_exe"]);
});

test("uniqueRegisteredProbes keeps one row per email and prefers default SSH", () => {
  const probes = uniqueRegisteredProbes([
    { identityFile: "/Users/alex/.ssh/id_ed25519", email: "alex@getjevy.com", error: null },
    { identityFile: null, email: "alex@getjevy.com", error: null },
    { identityFile: "/Users/alex/.ssh/id_exe", email: "alex@alexhughson.com", error: null },
    { identityFile: "/Users/alex/.ssh/github", email: null, error: "Permission denied" },
  ]);
  expect(probes.map((item) => item.email)).toEqual(["alex@getjevy.com", "alex@alexhughson.com"]);
  expect(probes[0]?.identityFile).toBeNull();
});

test("isDiscoverableSshKeyName keeps private keys and drops host files", () => {
  expect(isDiscoverableSshKeyName("id_exe")).toBe(true);
  expect(isDiscoverableSshKeyName("id_ed25519")).toBe(true);
  expect(isDiscoverableSshKeyName("id_ed25519.pub")).toBe(false);
  expect(isDiscoverableSshKeyName("known_hosts")).toBe(false);
  expect(isDiscoverableSshKeyName("config")).toBe(false);
});
