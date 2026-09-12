import { app, BrowserWindow, ipcMain, nativeImage } from "electron";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { PreviewTarget, SshSettings } from "@shared/types";
import { attachPreview, openExternal, previewLoggedIn, type PreviewController } from "./preview";
import { SessionHub } from "./sessionHub";
import { SshTerminal } from "./sshTerminal";

function wantsDemo(): boolean {
  return process.argv.includes("--demo") || process.argv.includes("--screenshot");
}

function wantsScreenshot(): boolean {
  return process.argv.includes("--screenshot");
}

function resourceIcon(name: string): string {
  const path = join(__dirname, "../../resources", name);
  if (!existsSync(path)) {
    throw new Error(`missing app icon: ${path}`);
  }
  return path;
}

function applyAppIcon(window: BrowserWindow): void {
  const square = nativeImage.createFromPath(resourceIcon("icon.png"));
  if (square.isEmpty()) {
    throw new Error(`app icon failed to load: ${resourceIcon("icon.png")}`);
  }
  if (process.platform !== "darwin") {
    window.setIcon(square);
  }
  if (app.dock) {
    const dock = nativeImage.createFromPath(resourceIcon("icon-dock.png"));
    if (dock.isEmpty()) {
      throw new Error(`dock icon failed to load: ${resourceIcon("icon-dock.png")}`);
    }
    app.dock.setIcon(dock);
  }
}

function createWindow(): void {
  const window = new BrowserWindow({
    width: wantsScreenshot() ? 1280 : 1440,
    height: wantsScreenshot() ? 760 : 920,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: "#f4f4f4",
    titleBarStyle: "hiddenInset",
    roundedCorners: true,
    trafficLightPosition: { x: 16, y: 16 },
    icon: resourceIcon("icon.png"),
    webPreferences: {
      preload: join(__dirname, "../preload/index.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  const send = (channel: string, payload: unknown) => {
    if (window.isDestroyed() || window.webContents.isDestroyed()) {
      return;
    }
    window.webContents.send(channel, payload);
  };
  const preview = attachPreview(window, (email, loggedIn) => {
    send("auth:preview", { email, loggedIn });
  });
  const terminal = new SshTerminal((event) => {
    send("terminal:event", event);
  });
  const hub = new SessionHub(
    (event) => {
      send("shelley:event", event);
    },
    wantsDemo(),
    app.getPath("userData"),
  );
  bindIpc(hub, preview, terminal);

  window.webContents.on("preload-error", (_event, path, error) => {
    console.error("preload-error", path, error);
  });

  window.on("close", () => {
    terminal.dispose();
    hub.stop();
    preview.destroy();
  });

  applyAppIcon(window);

  if (process.env.ELECTRON_RENDERER_URL) {
    void window.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void window.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

function bindIpc(hub: SessionHub, preview: PreviewController, terminal: SshTerminal): void {
  ipcMain.removeHandler("machines.list");
  ipcMain.removeHandler("machines.create");
  ipcMain.removeHandler("catalogs.loadAll");
  ipcMain.removeHandler("models.list");
  ipcMain.removeHandler("thread.open");
  ipcMain.removeHandler("thread.createDraft");
  ipcMain.removeHandler("thread.send");
  ipcMain.removeHandler("thread.cancel");
  ipcMain.removeHandler("thread.switchModel");
  ipcMain.removeHandler("auth.previewLoggedIn");
  ipcMain.removeHandler("machine.openTerminal");
  ipcMain.removeHandler("terminal.write");
  ipcMain.removeHandler("terminal.resize");
  ipcMain.removeHandler("terminal.close");
  ipcMain.removeHandler("preview.setUrl");
  ipcMain.removeHandler("preview.setBounds");
  ipcMain.removeHandler("preview.openExternal");
  ipcMain.removeHandler("fs.listDirs");
  ipcMain.removeHandler("fs.createDir");
  ipcMain.removeHandler("demo.scene");
  ipcMain.removeHandler("demo.ready");
  ipcMain.removeHandler("sshSettings.get");
  ipcMain.removeHandler("sshSettings.set");
  ipcMain.removeHandler("accounts.probe");

  ipcMain.handle("machines.list", () => hub.listMachines());
  ipcMain.handle("machines.create", (_event, name: string | null, identityFile: string | null) => {
    return hub.createMachine(name, identityFile);
  });
  ipcMain.handle("sshSettings.get", () => hub.getSshSettings());
  ipcMain.handle("sshSettings.set", (_event, settings: SshSettings) => hub.setSshSettings(settings));
  ipcMain.handle("accounts.probe", () => hub.probeAccounts());
  ipcMain.handle("catalogs.loadAll", () => hub.loadAllCatalogs());
  ipcMain.handle("models.list", (_event, machineId: string) => hub.listModels(machineId));
  ipcMain.handle("thread.open", (_event, machineId: string, threadId: string) => hub.openThread(machineId, threadId));
  ipcMain.handle("thread.createDraft", (_event, machineId: string, options) => hub.createDraft(machineId, options));
  ipcMain.handle("thread.send", (_event, machineId: string, threadId: string, message: string, options) => {
    return hub.sendChat(machineId, threadId, message, options);
  });
  ipcMain.handle("thread.cancel", (_event, machineId: string, threadId: string) => hub.cancelChat(machineId, threadId));
  ipcMain.handle("thread.switchModel", (_event, machineId: string, threadId: string, options) => {
    return hub.switchModel(machineId, threadId, options);
  });
  ipcMain.handle("auth.previewLoggedIn", (_event, accountEmail: string) => previewLoggedIn(accountEmail));
  ipcMain.handle("machine.openTerminal", (_event, machineId: string, cols: number, rows: number) => {
    terminal.open(machineId, hub.sshDest(machineId), cols, rows);
  });
  ipcMain.handle("terminal.write", (_event, machineId: string, data: string) => {
    terminal.write(machineId, data);
  });
  ipcMain.handle("terminal.resize", (_event, machineId: string, cols: number, rows: number) => {
    terminal.resize(machineId, cols, rows);
  });
  ipcMain.handle("terminal.close", () => {
    terminal.closeAll();
  });
  let previewLoadSeq = 0;
  ipcMain.handle("preview.setUrl", async (_event, target: PreviewTarget) => {
    const mine = ++previewLoadSeq;
    preview.activate(target.accountEmail);
    const skipAuth = wantsDemo();
    const needsLogin = !skipAuth && (Boolean(target.forceLogin) || !(await preview.loggedIn(target.accountEmail)));
    if (needsLogin) {
      const magic = await hub.magicLogin(target.identityFile);
      if (mine !== previewLoadSeq) {
        return;
      }
      await preview.loginWithMagic(target.accountEmail, magic);
    }
    if (mine !== previewLoadSeq) {
      return;
    }
    preview.load(target.url);
  });
  ipcMain.handle("preview.setBounds", (_event, bounds) => {
    if (!bounds) {
      preview.hide();
      return;
    }
    preview.show(bounds);
  });
  ipcMain.handle("preview.openExternal", (_event, url: string) => openExternal(url));
  ipcMain.handle("fs.listDirs", (_event, machineId: string, dir: string) => hub.listDirs(machineId, dir));
  ipcMain.handle("fs.createDir", (_event, machineId: string, dir: string) => hub.createDir(machineId, dir));
  ipcMain.handle("demo.scene", () => hub.demoScene());
  ipcMain.handle("demo.ready", async (event) => {
    if (!wantsScreenshot()) {
      return;
    }
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window) {
      throw new Error("demo.ready: no window");
    }
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 400);
    });
    const png = await window.webContents.capturePage();
    const dest = join(__dirname, "../../docs/interface.png");
    mkdirSync(join(__dirname, "../../docs"), { recursive: true });
    writeFileSync(dest, png.toPNG());
    process.stdout.write(`wrote ${dest}\n`);
    app.quit();
  });
}

app.setName("Diodati");

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("render-process-gone", (_event, _webContents, details) => {
  console.error("render-process-gone", details.reason, details.exitCode);
});

app.on("child-process-gone", (_event, details) => {
  console.error("child-process-gone", details.type, details.reason, details.exitCode);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
