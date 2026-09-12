import { contextBridge, ipcRenderer } from "electron";
import type { IpcApi, StreamEvent, TerminalEvent } from "@shared/ipc";
import type { ComposerOptions, MachineId, PreviewAuthEvent, PreviewTarget, SshSettings, ThreadId } from "@shared/types";

const api: IpcApi = {
  listMachines: () => ipcRenderer.invoke("machines.list"),
  createMachine: (name: string | null, identityFile: string | null) => {
    return ipcRenderer.invoke("machines.create", name, identityFile);
  },
  getSshSettings: () => ipcRenderer.invoke("sshSettings.get"),
  setSshSettings: (settings: SshSettings) => ipcRenderer.invoke("sshSettings.set", settings),
  probeAccounts: () => ipcRenderer.invoke("accounts.probe"),
  loadAllCatalogs: () => ipcRenderer.invoke("catalogs.loadAll"),
  listModels: (machineId: MachineId) => ipcRenderer.invoke("models.list", machineId),
  openThread: (machineId: MachineId, threadId: ThreadId) => ipcRenderer.invoke("thread.open", machineId, threadId),
  createDraft: (machineId: MachineId, options: ComposerOptions) => {
    return ipcRenderer.invoke("thread.createDraft", machineId, options);
  },
  sendChat: (machineId: MachineId, threadId: ThreadId, message: string, options: ComposerOptions) => {
    return ipcRenderer.invoke("thread.send", machineId, threadId, message, options);
  },
  cancelChat: (machineId: MachineId, threadId: ThreadId) => ipcRenderer.invoke("thread.cancel", machineId, threadId),
  switchModel: (machineId: MachineId, threadId: ThreadId, options: ComposerOptions) => {
    return ipcRenderer.invoke("thread.switchModel", machineId, threadId, options);
  },
  previewLoggedIn: (accountEmail: string) => ipcRenderer.invoke("auth.previewLoggedIn", accountEmail),
  onPreviewAuth: (handler: (event: PreviewAuthEvent) => void) => {
    const listener = (_event: unknown, event: PreviewAuthEvent) => {
      handler(event);
    };
    ipcRenderer.on("auth:preview", listener);
    return () => {
      ipcRenderer.removeListener("auth:preview", listener);
    };
  },
  openTerminal: (machineId: MachineId, cols: number, rows: number) => {
    return ipcRenderer.invoke("machine.openTerminal", machineId, cols, rows);
  },
  writeTerminal: (machineId: MachineId, data: string) => ipcRenderer.invoke("terminal.write", machineId, data),
  resizeTerminal: (machineId: MachineId, cols: number, rows: number) => {
    return ipcRenderer.invoke("terminal.resize", machineId, cols, rows);
  },
  closeTerminal: () => ipcRenderer.invoke("terminal.close"),
  onTerminal: (handler: (event: TerminalEvent) => void) => {
    const listener = (_event: unknown, payload: TerminalEvent) => {
      handler(payload);
    };
    ipcRenderer.on("terminal:event", listener);
    return () => {
      ipcRenderer.removeListener("terminal:event", listener);
    };
  },
  setPreviewUrl: (target: PreviewTarget) => ipcRenderer.invoke("preview.setUrl", target),
  setPreviewBounds: (bounds) => ipcRenderer.invoke("preview.setBounds", bounds),
  openExternal: (url: string) => ipcRenderer.invoke("preview.openExternal", url),
  listRemoteDirs: (machineId: MachineId, dir: string) => ipcRenderer.invoke("fs.listDirs", machineId, dir),
  createRemoteDir: (machineId: MachineId, dir: string) => ipcRenderer.invoke("fs.createDir", machineId, dir),
  demoScene: () => ipcRenderer.invoke("demo.scene"),
  demoReady: () => ipcRenderer.invoke("demo.ready"),
  onStream: (handler: (event: StreamEvent) => void) => {
    const listener = (_event: unknown, payload: StreamEvent) => {
      handler(payload);
    };
    ipcRenderer.on("shelley:event", listener);
    return () => {
      ipcRenderer.removeListener("shelley:event", listener);
    };
  },
};

contextBridge.exposeInMainWorld("diodati", api);
