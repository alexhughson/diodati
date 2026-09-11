import type { Machine, MachineId, MachineOwnership } from "@shared/types";

export type ExeVmRow = {
  vm_name: string;
  emoji?: string;
  status?: string;
  ssh_dest?: string;
  ssh_command?: string;
  https_url?: string;
  shelley_url?: string;
  terminal_url?: string;
  proxy_port?: number;
  access?: { shell?: boolean; web?: boolean; admin?: boolean };
};

export type ExeLsJson = {
  vms?: ExeVmRow[];
  shared_vms?: ExeVmRow[];
  team_shared_vms?: ExeVmRow[];
};

export function parseSshDest(row: ExeVmRow): string {
  if (row.ssh_dest && row.ssh_dest.length > 0) {
    return row.ssh_dest;
  }
  const command = row.ssh_command ?? "";
  const prefix = "ssh ";
  if (command.startsWith(prefix)) {
    return command.slice(prefix.length).trim();
  }
  if (row.vm_name && row.vm_name.length > 0) {
    return `${row.vm_name}.exe.xyz`;
  }
  throw new Error("exe.dev vm row is missing ssh dest and vm_name");
}

export function machineFromRow(row: ExeVmRow, ownership: MachineOwnership): Machine {
  const id = row.vm_name;
  if (!id) {
    throw new Error("exe.dev vm row is missing vm_name");
  }
  return {
    id,
    name: id,
    emoji: row.emoji ?? "💻",
    status: row.status ?? "unknown",
    sshDest: parseSshDest(row),
    httpsUrl: row.https_url ?? `https://${id}.exe.xyz`,
    shelleyUrl: row.shelley_url ?? `https://${id}.shelley.exe.xyz`,
    terminalUrl: row.terminal_url ?? `https://${id}.xterm.exe.xyz`,
    proxyPort: row.proxy_port ?? null,
    ownership,
    canShell: row.access?.shell !== false,
  };
}

export function machinesFromLs(payload: ExeLsJson): Machine[] {
  const owned = (payload.vms ?? []).map((row) => machineFromRow(row, "owned"));
  const shared = (payload.shared_vms ?? []).map((row) => machineFromRow(row, "shared"));
  const team = (payload.team_shared_vms ?? []).map((row) => machineFromRow(row, "team"));
  const byId = new Map<MachineId, Machine>();
  for (const machine of [...owned, ...shared, ...team]) {
    const existing = byId.get(machine.id);
    if (!existing) {
      byId.set(machine.id, machine);
      continue;
    }
    if (existing.ownership === "owned") {
      continue;
    }
    byId.set(machine.id, machine);
  }
  const reachable = [...byId.values()].filter((machine) => machine.canShell);
  return reachable.sort((left, right) => left.name.localeCompare(right.name));
}

export function requireMachine(machines: Machine[], machineId: MachineId): Machine {
  const found = machines.find((machine) => machine.id === machineId);
  if (!found) {
    throw new Error(`unknown machine: ${machineId}`);
  }
  if (!found.canShell) {
    throw new Error(`${machineId} does not grant shell access`);
  }
  return found;
}
