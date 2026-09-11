import { cookieMeansExeWebLogin } from "@domain/exeWebAuth";
import { BrowserView, type BrowserWindow, session, shell } from "electron";

const PARTITION = "persist:exevibe-preview";

export type PreviewController = {
  show: (bounds: { x: number; y: number; width: number; height: number }) => void;
  hide: () => void;
  load: (url: string) => void;
  destroy: () => void;
};

export function attachPreview(window: BrowserWindow): PreviewController {
  const view = new BrowserView({
    webPreferences: {
      partition: PARTITION,
      sandbox: true,
      contextIsolation: true,
    },
  });
  view.setAutoResize({ width: false, height: false });
  window.addBrowserView(view);

  const dead = () => window.isDestroyed() || view.webContents.isDestroyed();

  return {
    show: (bounds) => {
      if (dead()) {
        return;
      }
      if (bounds.width < 40 || bounds.height < 40) {
        view.setBounds({ x: 0, y: 0, width: 0, height: 0 });
        return;
      }
      view.setBounds(bounds);
    },
    hide: () => {
      if (dead()) {
        return;
      }
      view.setBounds({ x: 0, y: 0, width: 0, height: 0 });
    },
    load: (url) => {
      if (dead()) {
        return;
      }
      const current = view.webContents.getURL();
      if (current === url) {
        return;
      }
      void view.webContents.loadURL(url);
    },
    destroy: () => {
      if (window.isDestroyed()) {
        return;
      }
      window.removeBrowserView(view);
      if (view.webContents.isDestroyed()) {
        return;
      }
      view.webContents.close();
    },
  };
}

export function previewSession() {
  return session.fromPartition(PARTITION);
}

export async function previewLoggedIn(): Promise<boolean> {
  const cookies = await previewSession().cookies.get({});
  for (const cookie of cookies) {
    if (cookieMeansExeWebLogin(cookie)) {
      return true;
    }
  }
  return false;
}

export function watchPreviewLogin(onChange: (loggedIn: boolean) => void): () => void {
  const jar = previewSession().cookies;
  const listener = (_event: unknown, cookie: { name: string; domain: string }) => {
    if (!cookieMeansExeWebLogin(cookie)) {
      return;
    }
    void previewLoggedIn().then(onChange);
  };
  jar.on("changed", listener);
  return () => {
    jar.off("changed", listener);
  };
}

export async function openExternal(url: string): Promise<void> {
  await shell.openExternal(url);
}
