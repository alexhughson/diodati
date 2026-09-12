import { expect, test } from "bun:test";
import { exeNewArgs, exeVmName, machineFromNewJson, machinesFromLs, parseSshDest } from "./machine";

test("owned rows keep ssh_dest", () => {
  expect(parseSshDest({ vm_name: "alley-tablebase", ssh_dest: "alley-tablebase.exe.xyz" })).toBe("alley-tablebase.exe.xyz");
});

test("team rows take dest from ssh_command", () => {
  expect(parseSshDest({ vm_name: "jevdev-3001eb18", ssh_command: "ssh vm+jevdev-3001eb18@vm.exe.xyz" })).toBe(
    "vm+jevdev-3001eb18@vm.exe.xyz",
  );
});

test("machinesFromLs prefers owned over shared duplicates", () => {
  const machines = machinesFromLs({
    vms: [{ vm_name: "alley-tablebase", ssh_dest: "alley-tablebase.exe.xyz", access: { shell: true } }],
    shared_vms: [{ vm_name: "alley-tablebase", access: { shell: false } }],
  });
  expect(machines.length).toBe(1);
  expect(machines[0]?.ownership).toBe("owned");
  expect(machines[0]?.canShell).toBe(true);
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
  );
  expect(machine.id).toBe("byron-cabin");
  expect(machine.sshDest).toBe("byron-cabin.exe.xyz");
  expect(machine.canShell).toBe(true);
});

test("machineFromNewJson throws when vm_name is missing", () => {
  expect(() => machineFromNewJson(JSON.stringify({ ssh_dest: "x.exe.xyz" }))).toThrow("vm_name");
});

test("machinesFromLs drops rows without shell access", () => {
  const machines = machinesFromLs({
    vms: [{ vm_name: "alley-tablebase", ssh_dest: "alley-tablebase.exe.xyz", access: { shell: true } }],
    shared_vms: [{ vm_name: "gorgias-demo", access: { shell: false, web: true } }],
  });
  expect(machines.map((machine) => machine.id)).toEqual(["alley-tablebase"]);
});
