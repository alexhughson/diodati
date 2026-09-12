import { useEffect, useState } from "react";
import { firstErrorLine } from "@domain/exeConnect";
import { identityKey } from "@domain/exeAccount";
import type { ExeAccountProbe, SshSettings } from "@shared/types";
import type { TerminalDock } from "./prefs";
import type { ThemeId } from "./themes";
import { ThemeSwitcher } from "./ThemeSwitcher";

type Props = {
  theme: ThemeId;
  onTheme: (id: ThemeId) => void;
  terminalDock: TerminalDock;
  onTerminalDock: (dock: TerminalDock) => void;
  onKeysChanged: () => void;
  onClose: () => void;
};

export function SettingsPage(props: Props) {
  const [probes, setProbes] = useState<ExeAccountProbe[]>([]);
  const [settings, setSettings] = useState<SshSettings>({ activeIdentityKeys: ["default"] });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    setBusy(true);
    setError(null);
    try {
      const nextSettings = await window.diodati.getSshSettings();
      const nextProbes = await window.diodati.probeAccounts();
      setSettings(nextSettings);
      setProbes(nextProbes);
    } catch (err) {
      setError(firstErrorLine(err instanceof Error ? err.message : String(err)));
    }
    setBusy(false);
  };

  useEffect(() => {
    void reload();
  }, []);

  const toggle = async (key: string, on: boolean) => {
    setBusy(true);
    setError(null);
    try {
      const activeIdentityKeys: string[] = [];
      for (const item of settings.activeIdentityKeys) {
        if (item !== key) {
          activeIdentityKeys.push(item);
        }
      }
      if (on) {
        activeIdentityKeys.push(key);
      }
      const next = await window.diodati.setSshSettings({ activeIdentityKeys });
      setSettings(next);
      props.onKeysChanged();
    } catch (err) {
      setError(firstErrorLine(err instanceof Error ? err.message : String(err)));
    }
    setBusy(false);
  };

  return (
    <section className="chat-main">
      <header className="chat-header">
        <div>
          <h2>Settings</h2>
          <p>Theme, terminal layout, and exe.dev accounts</p>
        </div>
        <button className="ghost" onClick={props.onClose}>
          back
        </button>
      </header>
      <div className="settings-body">
        <div className="settings-block">
          <h3>Color theme</h3>
          <ThemeSwitcher theme={props.theme} onTheme={props.onTheme} />
        </div>
        <div className="settings-block">
          <h3>Terminal side</h3>
          <p>Where the shell sits when it is open</p>
          <div className="dock-switch">
            <button
              className={props.terminalDock === "bottom" ? "ghost active" : "ghost"}
              onClick={() => props.onTerminalDock("bottom")}
            >
              bottom
            </button>
            <button
              className={props.terminalDock === "right" ? "ghost active" : "ghost"}
              onClick={() => props.onTerminalDock("right")}
            >
              right
            </button>
          </div>
        </div>
        <div className="settings-block">
          <h3>exe.dev accounts</h3>
          <p>Diodati finds keys that exe.dev already accepts. Tick the accounts to list.</p>
          {probes.length === 0 && !busy ? (
            <p>No registered keys on this computer.</p>
          ) : null}
          {probes.map((probe) => {
            const key = identityKey(probe.identityFile);
            const active = settings.activeIdentityKeys.includes(key);
            const detail = probe.identityFile ?? "default SSH";
            return (
              <label className="account-row" key={key}>
                <input
                  type="checkbox"
                  checked={active}
                  disabled={busy}
                  onChange={(event) => {
                    void toggle(key, event.target.checked);
                  }}
                />
                <div className="account-copy">
                  <div className="account-email">{probe.email}</div>
                  <div className="account-path">{detail}</div>
                </div>
              </label>
            );
          })}
          {error ? <div className="folder-status error">{error}</div> : null}
        </div>
      </div>
    </section>
  );
}
