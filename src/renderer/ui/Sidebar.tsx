import { groupThreads } from "@domain/catalog";
import { displayFolder } from "@domain/thread";
import { threadTitle } from "@domain/thread";
import type { MachineCatalog, Thread } from "@shared/types";
import { ComposeIcon, PlusIcon, RefreshIcon, TerminalIcon } from "./icons";
import { Splitter } from "./Splitter";

type Props = {
  catalogs: MachineCatalog[];
  loadingMachines: boolean;
  connectHint: string | null;
  settingsOpen: boolean;
  createMachineOpen: boolean;
  onOpenSettings: () => void;
  onOpenCreateMachine: () => void;
  selectedMachineId: string | null;
  selectedThreadId: string | null;
  onSelectMachine: (machineId: string) => void;
  onSelectThread: (thread: Thread) => void;
  onNewThread: (machineId: string) => void;
  onOpenTerminal: (machineId: string) => void;
  terminalOpen: boolean;
  onRefreshMachines: () => void;
  width: number;
  onResizeStart: () => number;
  onResize: (width: number) => void;
  onResizeEnd: () => void;
};

export function Sidebar(props: Props) {
  return (
    <aside className="sidebar">
      <div className="sidebar-body">
      <div className="brand">
        <h1>Diodati</h1>
        <div className="brand-actions">
        <button
          className={props.createMachineOpen ? "icon-btn active" : "icon-btn"}
          title="new machine"
          disabled={props.loadingMachines || Boolean(props.connectHint)}
          onClick={props.onOpenCreateMachine}
        >
          <PlusIcon />
        </button>
        <button
          className="icon-btn"
          title="rescan machines"
          disabled={props.loadingMachines}
          onClick={props.onRefreshMachines}
        >
          <RefreshIcon />
        </button>
        <button
          className={props.settingsOpen ? "icon-btn active" : "icon-btn"}
          title="settings"
          onClick={props.onOpenSettings}
        >
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
            <path
              fill="currentColor"
              d="M6.4 1.3h3.2l.3 1.5a4.8 4.8 0 0 1 1.4.8l1.4-.6 1.6 2.8-1.2 1c.1.4.1.8.1 1.2s0 .8-.1 1.2l1.2 1-1.6 2.8-1.4-.6a4.8 4.8 0 0 1-1.4.8l-.3 1.5H6.4l-.3-1.5a4.8 4.8 0 0 1-1.4-.8l-1.4.6L1.7 10l1.2-1a5 5 0 0 1 0-2.4l-1.2-1 1.6-2.8 1.4.6a4.8 4.8 0 0 1 1.4-.8l.3-1.5ZM8 6.2A1.8 1.8 0 1 0 8 9.8 1.8 1.8 0 0 0 8 6.2Z"
            />
          </svg>
        </button>
        </div>
      </div>
      <div className="machine-list">
        {props.loadingMachines && props.catalogs.length === 0 ? <div className="empty">reading machines…</div> : null}
        {!props.loadingMachines && props.catalogs.length === 0 && props.connectHint ? (
          <div className="empty">{props.connectHint}</div>
        ) : null}
        {props.catalogs.map((catalog) => (
          <MachineBlock
            key={catalog.machine.id}
            catalog={catalog}
            selectedMachineId={props.selectedMachineId}
            selectedThreadId={props.selectedThreadId}
            onSelectMachine={props.onSelectMachine}
            onSelectThread={props.onSelectThread}
            onNewThread={props.onNewThread}
            onOpenTerminal={props.onOpenTerminal}
            terminalOpen={props.terminalOpen}
          />
        ))}
      </div>
      </div>
      <Splitter
        axis="x"
        end
        onDragStart={props.onResizeStart}
        onDrag={props.onResize}
        onDragEnd={props.onResizeEnd}
      />
    </aside>
  );
}

function MachineBlock(props: {
  catalog: MachineCatalog;
  selectedMachineId: string | null;
  selectedThreadId: string | null;
  onSelectMachine: (machineId: string) => void;
  onSelectThread: (thread: Thread) => void;
  onNewThread: (machineId: string) => void;
  onOpenTerminal: (machineId: string) => void;
  terminalOpen: boolean;
}) {
  const machine = props.catalog.machine;
  const groups = groupThreads(props.catalog.threads);
  const flattenFolders = groups.length <= 1;
  const loadError = props.catalog.loadError;
  let dotClass = "dot";
  if (loadError) {
    dotClass = "dot error";
  } else if (machine.status === "running") {
    dotClass = "dot running";
  }
  return (
    <div className="machine-block">
      <div className={machine.id === props.selectedMachineId ? "machine-row active" : "machine-row"}>
        <button
          className="machine"
          title={loadError ? loadError.split("\n")[0] : undefined}
          onClick={() => props.onSelectMachine(machine.id)}
        >
          <span className="emoji">{machine.emoji}</span>
          <span className="name">{machine.name}</span>
          <span className={dotClass} title={loadError ?? machine.status} />
        </button>
        <button
          className="icon-btn"
          title={
            props.terminalOpen && machine.id === props.selectedMachineId
              ? `hide terminal on ${machine.name}`
              : `show terminal on ${machine.name}`
          }
          disabled={!machine.canShell}
          onClick={() => props.onOpenTerminal(machine.id)}
        >
          <TerminalIcon />
        </button>
        <button
          className="icon-btn"
          title={`new thread on ${machine.name}`}
          disabled={!machine.canShell}
          onClick={() => props.onNewThread(machine.id)}
        >
          <ComposeIcon />
        </button>
      </div>
      {groups.map((group) => (
        <div key={group.cwd ?? "no-cwd"}>
          {flattenFolders ? null : (
            <div className="folder-label">{displayFolder(group.cwd, props.catalog.homeDir)}</div>
          )}
          {group.threads.map((thread) => {
            const title = threadTitle(thread);
            return (
            <button
              key={thread.id}
              className={thread.id === props.selectedThreadId ? "thread active" : "thread"}
              title={title}
              onClick={() => props.onSelectThread(thread)}
            >
              <span className="title" title={title}>
                {title}
              </span>
              {thread.working ? <span className="thread-preview">working</span> : null}
            </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
