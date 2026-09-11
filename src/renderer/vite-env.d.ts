import type { IpcApi } from "@shared/ipc";

declare global {
  interface Window {
    exevibe: IpcApi;
  }
}

export {};
