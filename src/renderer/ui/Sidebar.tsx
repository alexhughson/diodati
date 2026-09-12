import { useState } from "react";
import { groupThreads } from "@domain/catalog";
import { showAccountLabels } from "@domain/exeAccount";
import { machineIds, moveManualOrder, sortCatalogs, syncManualOrder, type SidebarSort } from "@domain/sidebarOrder";
import { displayFolder } from "@domain/thread";
import { threadTitle } from "@domain/thread";
import type { MachineCatalog, Thread } from "@shared/types";
import { CaretIcon, ComposeIcon, PlusIcon, RefreshIcon, SortIcon, TerminalIcon } from "./icons";
import { Pop } from "./Pop";
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
  sidebarSort: SidebarSort;
  manualOrder: string[];
  onSidebarSort: (sort: SidebarSort) => void;
  onManualOrder: (order: string[]) => void;
  collapsedIds: string[];
  onToggleCollapsed: (machineId: string) => void;
  width: number;
  onResizeStart: () => number;
  onResize: (width: number) => void;
  onResizeEnd: () => void;
};

export function Sidebar(props: Props) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropId, setDropId] = useState<string | null>(null);
  const [sortOpen, setSortOpen] = useState(false);
  const emails: string[] = [];
  for (const catalog of props.catalogs) {
    emails.push(catalog.machine.accountEmail);
  }
  const showAccount = showAccountLabels(emails);
  const visible = sortCatalogs(props.catalogs, props.sidebarSort, props.manualOrder);
  const manual = props.sidebarSort === "manual";

  const dropOn = (sourceId: string, targetId: string) => {
    const synced = syncManualOrder(props.manualOrder, props.catalogs);
    const seeded = synced.length > 0 ? synced : machineIds(visible);
    props.onManualOrder(moveManualOrder(seeded, sourceId, targetId));
    setDragId(null);
    setDropId(null);
  };

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
        <Pop open={sortOpen} onClose={() => setSortOpen(false)}>
          <button
            className={sortOpen ? "icon-btn active" : "icon-btn"}
            title="sort machines"
            onClick={() => setSortOpen(!sortOpen)}
          >
            <SortIcon />
          </button>
          {sortOpen ? (
            <div className="pop-menu pop-menu-down pop-menu-narrow" role="menu">
              <button
                className={props.sidebarSort === "recent" ? "pop-item active" : "pop-item"}
                onClick={() => {
                  props.onSidebarSort("recent");
                  setSortOpen(false);
                }}
              >
                Most recent
              </button>
              <button
                className={props.sidebarSort === "default" ? "pop-item active" : "pop-item"}
                onClick={() => {
                  props.onSidebarSort("default");
                  setSortOpen(false);
                }}
              >
                Default
              </button>
              <button
                className={props.sidebarSort === "manual" ? "pop-item active" : "pop-item"}
                onClick={() => {
                  props.onSidebarSort("manual");
                  setSortOpen(false);
                }}
              >
                Manual
              </button>
            </div>
          ) : null}
        </Pop>
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
        {visible.map((catalog) => (
          <MachineBlock
            key={catalog.machine.id}
            catalog={catalog}
            showAccount={showAccount}
            manual={manual}
            dragging={dragId === catalog.machine.id}
            dropTarget={dropId === catalog.machine.id}
            selectedMachineId={props.selectedMachineId}
            selectedThreadId={props.selectedThreadId}
            onSelectMachine={props.onSelectMachine}
            onSelectThread={props.onSelectThread}
            onNewThread={props.onNewThread}
            onOpenTerminal={props.onOpenTerminal}
            terminalOpen={props.terminalOpen}
            onDragStart={(id) => {
              setDragId(id);
            }}
            onDragOver={(id) => {
              setDropId(id);
            }}
            onDragEnd={() => {
              setDragId(null);
              setDropId(null);
            }}
            onDrop={dropOn}
            collapsed={props.collapsedIds.includes(catalog.machine.id)}
            onToggleCollapsed={() => props.onToggleCollapsed(catalog.machine.id)}
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
  showAccount: boolean;
  manual: boolean;
  dragging: boolean;
  dropTarget: boolean;
  selectedMachineId: string | null;
  selectedThreadId: string | null;
  onSelectMachine: (machineId: string) => void;
  onSelectThread: (thread: Thread) => void;
  onNewThread: (machineId: string) => void;
  onOpenTerminal: (machineId: string) => void;
  terminalOpen: boolean;
  onDragStart: (machineId: string) => void;
  onDragOver: (machineId: string) => void;
  onDragEnd: () => void;
  onDrop: (sourceId: string, targetId: string) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
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
  let blockClass = "machine-block";
  if (props.dragging) {
    blockClass = "machine-block dragging";
  } else if (props.dropTarget) {
    blockClass = "machine-block drop-target";
  }
  return (
    <div
      className={blockClass}
      onDragOver={(event) => {
        if (!props.manual) {
          return;
        }
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        props.onDragOver(machine.id);
      }}
      onDrop={(event) => {
        if (!props.manual) {
          return;
        }
        event.preventDefault();
        const sourceId = event.dataTransfer.getData("text/machine-id");
        if (sourceId.length === 0) {
          return;
        }
        props.onDrop(sourceId, machine.id);
      }}
    >
      <div
        className={machine.id === props.selectedMachineId ? "machine-row active" : "machine-row"}
        draggable={props.manual}
        onDragStart={(event) => {
          if (!props.manual) {
            return;
          }
          const origin = event.target;
          if (origin instanceof Element && origin.closest("button.caret")) {
            event.preventDefault();
            return;
          }
          event.dataTransfer.setData("text/machine-id", machine.id);
          event.dataTransfer.effectAllowed = "move";
          props.onDragStart(machine.id);
        }}
        onDragEnd={() => {
          props.onDragEnd();
        }}
      >
        <button
          className={props.collapsed ? "caret" : "caret open"}
          title={props.collapsed ? `show threads on ${machine.name}` : `hide threads on ${machine.name}`}
          aria-expanded={!props.collapsed}
          draggable={false}
          onMouseDown={(event) => {
            event.stopPropagation();
          }}
          onClick={(event) => {
            event.stopPropagation();
            props.onToggleCollapsed();
          }}
        >
          <CaretIcon />
        </button>
        <button
          className="machine"
          title={loadError ? loadError.split("\n")[0] : undefined}
          onClick={() => props.onSelectMachine(machine.id)}
        >
          <span className="emoji">{machine.emoji}</span>
          <span className="machine-copy">
            <span className="name">{machine.name}</span>
            {props.showAccount ? (
              <span className="account" title={machine.accountEmail}>
                {machine.accountEmail}
              </span>
            ) : null}
          </span>
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
      {props.collapsed
        ? null
        : groups.map((group) => (
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
