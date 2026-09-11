import { expect, test } from "bun:test";
import { machinesFromLs, parseSshDest } from "./machine";

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

test("machinesFromLs drops rows without shell access", () => {
  const machines = machinesFromLs({
    vms: [{ vm_name: "alley-tablebase", ssh_dest: "alley-tablebase.exe.xyz", access: { shell: true } }],
    shared_vms: [{ vm_name: "gorgias-demo", access: { shell: false, web: true } }],
  });
  expect(machines.map((machine) => machine.id)).toEqual(["alley-tablebase"]);
});
