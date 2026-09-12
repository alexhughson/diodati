import { expect, test } from "bun:test";
import type { ExeAccount } from "./exeAccount";
import { exeNewArgs, exeVmName, machineFromNewJson, machinesFromLs, mergeAccountMachines, parseSshDest } from "./machine";

const jevy: ExeAccount = { email: "alex@getjevy.com", identityFile: null };
const hughson: ExeAccount = { email: "alex@alexhughson.com", identityFile: "/Users/alex/.ssh/id_exe" };

test("owned rows keep ssh_dest", () => {
  expect(parseSshDest({ vm_name: "alley-tablebase", ssh_dest: "alley-tablebase.exe.xyz" })).toBe("alley-tablebase.exe.xyz");
});

test("team rows take dest from ssh_command", () => {
  expect(parseSshDest({ vm_name: "jevdev-3001eb18", ssh_command: "ssh vm+jevdev-3001eb18@vm.exe.xyz" })).toBe(
    "vm+jevdev-3001eb18@vm.exe.xyz",
  );
});

test("machinesFromLs prefers owned over shared duplicates and stamps the account", () => {
  const machines = machinesFromLs(
    {
      vms: [{ vm_name: "alley-tablebase", ssh_dest: "alley-tablebase.exe.xyz", access: { shell: true } }],
      shared_vms: [{ vm_name: "alley-tablebase", access: { shell: false } }],
    },
    jevy,
  );
  expect(machines.length).toBe(1);
  expect(machines[0]?.ownership).toBe("owned");
  expect(machines[0]?.canShell).toBe(true);
  expect(machines[0]?.accountEmail).toBe("alex@getjevy.com");
  expect(machines[0]?.identityFile).toBeNull();
});

test("exeNewArgs omits --name when the name is empty", () => {
  expect(exeNewArgs(null)).toEqual(["new", "--json", "--no-email"]);
  expect(exeNewArgs("  ")).toEqual(["new", "--json", "--no-email"]);
  expect(exeNewArgs("villa-diodati")).toEqual(["new", "--json", "--no-email", "--name=villa-diodati"]);
});

test("exeVmName rejects names that are not a dns label", () => {
  expect(() => exeVmName("Villa")).toThrow("machine name");
  expect(() => exeVmName("foo bar")).toThrow("machine name");
  expect(() => exeVmName("--help")).toThrow("machine name");
});

test("machineFromNewJson reads a top-level vm row", () => {
  const machine = machineFromNewJson(
    JSON.stringify({
      vm_name: "byron-cabin",
      ssh_dest: "byron-cabin.exe.xyz",
      https_url: "https://byron-cabin.exe.xyz",
      status: "running",
      access: { shell: true },
    }),
    hughson,
  );
  expect(machine.id).toBe("byron-cabin");
  expect(machine.sshDest).toBe("byron-cabin.exe.xyz");
  expect(machine.canShell).toBe(true);
  expect(machine.accountEmail).toBe("alex@alexhughson.com");
  expect(machine.identityFile).toBe("/Users/alex/.ssh/id_exe");
});

test("machineFromNewJson throws when vm_name is missing", () => {
  expect(() => machineFromNewJson(JSON.stringify({ ssh_dest: "x.exe.xyz" }), jevy)).toThrow("vm_name");
});

test("machinesFromLs drops rows without shell access", () => {
  const machines = machinesFromLs(
    {
      vms: [{ vm_name: "alley-tablebase", ssh_dest: "alley-tablebase.exe.xyz", access: { shell: true } }],
      shared_vms: [{ vm_name: "gorgias-demo", access: { shell: false, web: true } }],
    },
    jevy,
  );
  expect(machines.map((machine) => machine.id)).toEqual(["alley-tablebase"]);
});

test("mergeAccountMachines keeps both accounts and prefers owned", () => {
  const jevyMachines = machinesFromLs(
    {
      vms: [{ vm_name: "alley-tablebase", ssh_dest: "alley-tablebase.exe.xyz", access: { shell: true } }],
    },
    jevy,
  );
  const hughsonMachines = machinesFromLs(
    {
      vms: [{ vm_name: "alexandria", ssh_dest: "alexandria.exe.xyz", access: { shell: true } }],
    },
    hughson,
  );
  const merged = mergeAccountMachines([jevyMachines, hughsonMachines]);
  expect(merged.map((machine) => machine.id)).toEqual(["alexandria", "alley-tablebase"]);
  expect(merged[0]?.accountEmail).toBe("alex@alexhughson.com");
  expect(merged[1]?.accountEmail).toBe("alex@getjevy.com");
});
