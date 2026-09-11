import type { IpcApi } from "@shared/ipc";

declare global {
  interface Window {
    diodati: IpcApi;
  }
}

export {};
