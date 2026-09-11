import { useEffect, useRef } from "react";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import { TerminalIcon } from "./icons";
import { Splitter } from "./Splitter";
import { readXtermTheme, type ThemeId } from "./themes";
import type { TerminalDock } from "./prefs";

type Session = {
  id: string;
  name: string;
};

type Props = {
  sessions: Session[];
  activeMachineId: string;
  visible: boolean;
  theme: ThemeId;
  dock: TerminalDock;
  onHide: () => void;
  onError: (message: string) => void;
  onResizeStart: () => number;
  onResize: (size: number) => void;
  onResizeEnd: () => void;
};

export function TerminalPane(props: Props) {
  const active = props.sessions.find((session) => session.id === props.activeMachineId) ?? null;

  return (
    <div className={props.visible ? "terminal-pane" : "terminal-pane hidden"}>
      <Splitter
        axis={props.dock === "right" ? "x" : "y"}
        invert
        onDragStart={props.onResizeStart}
        onDrag={props.onResize}
        onDragEnd={props.onResizeEnd}
      />
      <div className="terminal-bar">
        <span>{active ? `${active.name} ssh` : "ssh"}</span>
        <button className="icon-btn" title="hide terminal" onClick={props.onHide}>
          <TerminalIcon />
        </button>
      </div>
      {props.sessions.map((session) => (
        <TerminalSession
          key={session.id}
          machineId={session.id}
          active={props.visible && session.id === props.activeMachineId}
          theme={props.theme}
          onError={props.onError}
        />
      ))}
    </div>
  );
}

function TerminalSession(props: {
  machineId: string;
  active: boolean;
  theme: ThemeId;
  onError: (message: string) => void;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
      scrollback: 5000,
      theme: readXtermTheme(host),
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(host);
    termRef.current = term;
    fitRef.current = fit;

    const onData = term.onData((data) => {
      void window.diodati.writeTerminal(props.machineId, data);
    });
    const stopEvents = window.diodati.onTerminal((event) => {
      if (event.machineId !== props.machineId) {
        return;
      }
      if (event.kind === "data") {
        term.write(event.data);
        return;
      }
      term.write(`\r\n[ssh exited ${event.code}]\r\n`);
    });

    return () => {
      stopEvents();
      onData.dispose();
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
    };
  }, [props.machineId]);

  useEffect(() => {
    const term = termRef.current;
    const fit = fitRef.current;
    const host = hostRef.current;
    if (!term || !fit || !host || !props.active) {
      return;
    }
    fit.fit();
    void window.diodati.openTerminal(props.machineId, term.cols, term.rows).catch((err) => {
      props.onError(err instanceof Error ? err.message : String(err));
    });
    term.focus();
    const observer = new ResizeObserver(() => {
      if (host.clientHeight < 20) {
        return;
      }
      fit.fit();
      void window.diodati.resizeTerminal(props.machineId, term.cols, term.rows);
    });
    observer.observe(host);
    return () => {
      observer.disconnect();
    };
  }, [props.active, props.machineId, props.onError]);

  useEffect(() => {
    const term = termRef.current;
    const host = hostRef.current;
    if (!term || !host) {
      return;
    }
    term.options.theme = readXtermTheme(host);
  }, [props.theme]);

  return <div className={props.active ? "terminal-fill" : "terminal-fill hidden"} ref={hostRef} />;
}
