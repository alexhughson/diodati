import type { TerminalDock } from "./prefs";
import type { ThemeId } from "./themes";
import { ThemeSwitcher } from "./ThemeSwitcher";

type Props = {
  theme: ThemeId;
  onTheme: (id: ThemeId) => void;
  terminalDock: TerminalDock;
  onTerminalDock: (dock: TerminalDock) => void;
  onClose: () => void;
};

export function SettingsPage(props: Props) {
  return (
    <section className="chat-main">
      <header className="chat-header">
        <div>
          <h2>Settings</h2>
          <p>Theme and terminal layout</p>
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
      </div>
    </section>
  );
}
