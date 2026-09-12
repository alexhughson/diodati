import { cookieMeansExeWebLogin, previewPartition } from "@domain/exeWebAuth";
import { BrowserView, type BrowserWindow, type Cookie, session, shell } from "electron";

const LOGIN_WAIT_MS = 25_000;

type Slot = {
  email: string;
  view: BrowserView;
  stopWatch: () => void;
};

export type PreviewController = {
  show: (bounds: { x: number; y: number; width: number; height: number }) => void;
  hide: () => void;
  activate: (accountEmail: string) => void;
  load: (url: string) => void;
  loginWithMagic: (accountEmail: string, magicUrl: string) => Promise<void>;
  loggedIn: (accountEmail: string) => Promise<boolean>;
  destroy: () => void;
};

export function attachPreview(
  window: BrowserWindow,
  onAuth: (email: string, loggedIn: boolean) => void,
): PreviewController {
  const slots = new Map<string, Slot>();
  let activeEmail: string | null = null;
  let lastBounds: { x: number; y: number; width: number; height: number } | null = null;

  const dead = (view: BrowserView) => window.isDestroyed() || view.webContents.isDestroyed();

  const zero = (slot: Slot) => {
    if (dead(slot.view)) {
      return;
    }
    slot.view.setBounds({ x: 0, y: 0, width: 0, height: 0 });
  };

  const applyBounds = (slot: Slot, bounds: { x: number; y: number; width: number; height: number }) => {
    if (dead(slot.view)) {
      return;
    }
    if (bounds.width < 40 || bounds.height < 40) {
      zero(slot);
      return;
    }
    slot.view.setBounds(bounds);
  };

  const ensure = (accountEmail: string): Slot => {
    const existing = slots.get(accountEmail);
    if (existing) {
      return existing;
    }
    const view = new BrowserView({
      webPreferences: {
        partition: previewPartition(accountEmail),
        sandbox: true,
        contextIsolation: true,
      },
    });
    view.setAutoResize({ width: false, height: false });
    window.addBrowserView(view);
    const jar = session.fromPartition(previewPartition(accountEmail)).cookies;
    const stopWatch = watchSession(jar, (loggedIn) => {
      onAuth(accountEmail, loggedIn);
    });
    const slot = { email: accountEmail, view, stopWatch };
    slots.set(accountEmail, slot);
    return slot;
  };

  return {
    show: (bounds) => {
      lastBounds = bounds;
      if (!activeEmail) {
        return;
      }
      const slot = slots.get(activeEmail);
      if (!slot) {
        return;
      }
      applyBounds(slot, bounds);
    },
    hide: () => {
      lastBounds = null;
      for (const slot of slots.values()) {
        zero(slot);
      }
    },
    activate: (accountEmail) => {
      const slot = ensure(accountEmail);
      activeEmail = accountEmail;
      for (const item of slots.values()) {
        if (item.email === accountEmail) {
          continue;
        }
        zero(item);
      }
      if (window.isDestroyed() || dead(slot.view)) {
        return;
      }
      window.setTopBrowserView(slot.view);
      if (lastBounds) {
        applyBounds(slot, lastBounds);
      }
    },
    load: (url) => {
      if (!activeEmail) {
        throw new Error("preview has no active account");
      }
      const slot = slots.get(activeEmail);
      if (!slot || dead(slot.view)) {
        return;
      }
      const current = slot.view.webContents.getURL();
      if (current === url) {
        return;
      }
      void slot.view.webContents.loadURL(url);
    },
    loginWithMagic: async (accountEmail, magicUrl) => {
      const slot = ensure(accountEmail);
      if (dead(slot.view)) {
        throw new Error("preview view is gone");
      }
      await slot.view.webContents.loadURL(magicUrl);
      await waitForLogin(accountEmail);
    },
    loggedIn: (accountEmail) => previewLoggedIn(accountEmail),
    destroy: () => {
      for (const slot of slots.values()) {
        slot.stopWatch();
        if (window.isDestroyed()) {
          continue;
        }
        window.removeBrowserView(slot.view);
        if (!slot.view.webContents.isDestroyed()) {
          slot.view.webContents.close();
        }
      }
      slots.clear();
      activeEmail = null;
      lastBounds = null;
    },
  };
}

export async function previewLoggedIn(accountEmail: string): Promise<boolean> {
  const jar = session.fromPartition(previewPartition(accountEmail)).cookies;
  return cookiesHaveLogin(jar);
}

export async function openExternal(url: string): Promise<void> {
  await shell.openExternal(url);
}

async function cookiesHaveLogin(jar: Electron.Cookies): Promise<boolean> {
  const cookies = await jar.get({});
  for (const cookie of cookies) {
    if (cookieMeansExeWebLogin(cookie)) {
      return true;
    }
  }
  return false;
}

function watchSession(jar: Electron.Cookies, onChange: (loggedIn: boolean) => void): () => void {
  const listener = (_event: unknown, cookie: Cookie) => {
    if (!cookieMeansExeWebLogin(cookie)) {
      return;
    }
    void cookiesHaveLogin(jar).then(onChange);
  };
  jar.on("changed", listener);
  return () => {
    jar.off("changed", listener);
  };
}

async function waitForLogin(accountEmail: string): Promise<void> {
  const jar = session.fromPartition(previewPartition(accountEmail)).cookies;
  if (await cookiesHaveLogin(jar)) {
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      jar.off("changed", onChange);
      reject(new Error(`preview login timed out for ${accountEmail}`));
    }, LOGIN_WAIT_MS);
    const finish = () => {
      clearTimeout(timer);
      jar.off("changed", onChange);
      resolve();
    };
    const onChange = (_event: unknown, cookie: Cookie) => {
      if (!cookieMeansExeWebLogin(cookie)) {
        return;
      }
      finish();
    };
    jar.on("changed", onChange);
    void cookiesHaveLogin(jar).then((ok) => {
      if (ok) {
        finish();
      }
    });
  });
}
