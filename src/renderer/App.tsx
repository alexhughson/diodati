import { useEffect, useMemo, useState } from "react";
import { folderChoices, upsertThreadInCatalogs } from "@domain/catalog";
import { defaultModel } from "@domain/model";
import type { MachineCatalog, Model, ProjectedMessage, ReasoningLevel, Thread } from "@shared/types";
import { ChatPane } from "./ui/ChatPane";
import { Composer } from "./ui/Composer";
import { PreviewPane } from "./ui/PreviewPane";
import { SettingsPage } from "./ui/SettingsPage";
import { Sidebar } from "./ui/Sidebar";
import { TerminalPane } from "./ui/TerminalPane";
import {
  defaultLayoutSizes,
  readLayoutSizes,
  readTerminalDock,
  writeLayoutSizes,
  writeTerminalDock,
  type LayoutSizes,
  type TerminalDock,
} from "./ui/prefs";
import { readTheme, writeTheme, type ThemeId } from "./ui/themes";

export function App() {
  const [catalogs, setCatalogs] = useState<MachineCatalog[]>([]);
  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(null);
  const [models, setModels] = useState<Model[]>([]);
  const [thread, setThread] = useState<Thread | null>(null);
  const [composing, setComposing] = useState(false);
  const [draftCwd, setDraftCwd] = useState<string | null>(null);
  const [messages, setMessages] = useState<ProjectedMessage[]>([]);
  const [text, setText] = useState("");
  const [modelId, setModelId] = useState("");
  const [thinkingLevel, setThinkingLevel] = useState<ReasoningLevel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [liveDelta, setLiveDelta] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoggedIn, setPreviewLoggedIn] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [openedTerminalIds, setOpenedTerminalIds] = useState<string[]>([]);
  const [loadingMachines, setLoadingMachines] = useState(true);
  const [theme, setTheme] = useState<ThemeId>("paper");
  const [terminalDock, setTerminalDock] = useState<TerminalDock>("bottom");
  const [layout, setLayout] = useState<LayoutSizes>(defaultLayoutSizes);
  const [dragBlocksPreview, setDragBlocksPreview] = useState(false);

  const selectedCatalog = useMemo(() => {
    return catalogs.find((catalog) => catalog.machine.id === selectedMachineId) ?? null;
  }, [catalogs, selectedMachineId]);
  const selectedMachine = selectedCatalog?.machine ?? null;

  const folders = selectedCatalog ? folderChoices(selectedCatalog) : [];
  const activeCwd = thread?.cwd ?? draftCwd;
  const composerOptions = {
    model: modelId,
    cwd: activeCwd,
    thinkingLevel,
  };

  useEffect(() => {
    const next = readTheme();
    setTheme(next);
    document.documentElement.dataset.theme = next;
    setTerminalDock(readTerminalDock());
    setLayout(readLayoutSizes());
  }, []);

  const refreshMachines = async () => {
    setLoadingMachines(true);
    try {
      await window.diodati.listMachines();
      const nextCatalogs = await window.diodati.loadAllCatalogs();
      setCatalogs(nextCatalogs);
      if (selectedMachineId && !nextCatalogs.some((catalog) => catalog.machine.id === selectedMachineId)) {
        resetChat();
        setSelectedMachineId(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
    setLoadingMachines(false);
  };

  useEffect(() => {
    void refreshMachines();
  }, []);

  useEffect(() => {
    let alive = true;
    void window.diodati.previewLoggedIn().then((loggedIn) => {
      if (alive) {
        setPreviewLoggedIn(loggedIn);
      }
    });
    const stop = window.diodati.onPreviewAuth((loggedIn) => {
      setPreviewLoggedIn(loggedIn);
    });
    return () => {
      alive = false;
      stop();
    };
  }, []);

  useEffect(() => {
    return window.diodati.onStream((event) => {
      if (event.kind === "error") {
        setError(event.message);
        return;
      }
      if (event.kind === "messages") {
        if (thread && event.threadId === thread.id) {
          setMessages(event.messages);
          setLiveDelta("");
        }
        return;
      }
      if (event.kind === "delta") {
        if (thread && event.threadId === thread.id) {
          setLiveDelta((current) => current + event.text);
        }
        return;
      }
      if (event.kind === "working") {
        if (thread && event.threadId === thread.id) {
          setWorking(event.working);
        }
        return;
      }
      if (event.kind === "thread") {
        setThread((current) => {
          if (!current || current.id !== event.thread.id) {
            return current;
          }
          return event.thread;
        });
        setCatalogs((current) => upsertThreadInCatalogs(current, event.thread));
      }
    });
  }, [thread]);

  useEffect(() => {
    if (!selectedMachine || !previewOpen) {
      return;
    }
    void window.diodati.setPreviewUrl(selectedMachine.httpsUrl);
  }, [selectedMachine, previewOpen]);

  useEffect(() => {
    if (!terminalOpen || !selectedMachineId) {
      return;
    }
    setOpenedTerminalIds((ids) => {
      if (ids.includes(selectedMachineId)) {
        return ids;
      }
      return [...ids, selectedMachineId];
    });
  }, [terminalOpen, selectedMachineId]);

  const applyTheme = (id: ThemeId) => {
    setTheme(id);
    writeTheme(id);
    document.documentElement.dataset.theme = id;
  };

  const applyTerminalDock = (dock: TerminalDock) => {
    setTerminalDock(dock);
    writeTerminalDock(dock);
  };

  const applyLayout = (next: LayoutSizes) => {
    setLayout(next);
    writeLayoutSizes(next);
  };

  const markMachineError = (machineId: string, message: string | null) => {
    setCatalogs((current) => {
      return current.map((catalog) => {
        if (catalog.machine.id !== machineId) {
          return catalog;
        }
        return { ...catalog, loadError: message };
      });
    });
  };

  const resetChat = () => {
    setThread(null);
    setMessages([]);
    setLiveDelta("");
    setWorking(false);
    setText("");
    setError(null);
    setComposing(false);
  };

  const defaultCwd = (machineId: string): string | null => {
    const catalog = catalogs.find((item) => item.machine.id === machineId);
    if (!catalog) {
      return null;
    }
    const all = catalog.threads;
    const latest = [...all].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
    if (latest?.cwd) {
      return latest.cwd;
    }
    return catalog.homeDir;
  };

  const ensureModels = async (machineId: string) => {
    const machine = catalogs.find((item) => item.machine.id === machineId)?.machine;
    if (!machine || !machine.canShell) {
      setModels([]);
      return;
    }
    try {
      const nextModels = await window.diodati.listModels(machineId);
      setModels(nextModels);
      markMachineError(machineId, null);
      const current = nextModels.find((model) => model.id === modelId) ?? null;
      const chosen = current ?? defaultModel(nextModels);
      if (!chosen) {
        return;
      }
      if (!current) {
        setModelId(chosen.id);
        setThinkingLevel(chosen.defaultReasoningLevel);
      }
    } catch (err) {
      setModels([]);
      markMachineError(machineId, err instanceof Error ? err.message : String(err));
    }
  };

  const selectMachine = async (machineId: string) => {
    if (machineId !== selectedMachineId) {
      resetChat();
      setDraftCwd(defaultCwd(machineId));
    }
    setSelectedMachineId(machineId);
    await ensureModels(machineId);
  };

  const beginNewThread = async (machineId: string) => {
    resetChat();
    setSelectedMachineId(machineId);
    setComposing(true);
    setDraftCwd(defaultCwd(machineId));
    await ensureModels(machineId);
  };

  const selectThread = async (next: Thread) => {
    setError(null);
    setComposing(false);
    setSelectedMachineId(next.machineId);
    setThread(next);
    setLiveDelta("");
    setMessages([]);
    if (next.model) {
      setModelId(next.model);
    }
    if (next.cwd) {
      setDraftCwd(next.cwd);
    }
    try {
      await ensureModels(next.machineId);
      const opened = await window.diodati.openThread(next.machineId, next.id);
      setThread(opened.thread);
      setMessages(opened.messages);
      setWorking(opened.thread.working);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const send = async () => {
    if (!selectedMachineId || !modelId || text.trim().length === 0) {
      return;
    }
    const message = text;
    setText("");
    setError(null);
    try {
      let current = thread;
      if (!current) {
        const created = await window.diodati.createDraft(selectedMachineId, composerOptions);
        current = created;
        setThread(created);
        setComposing(false);
        setCatalogs((existing) => upsertThreadInCatalogs(existing, created));
      }
      await window.diodati.sendChat(selectedMachineId, current.id, message, composerOptions);
      setWorking(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const cancel = async () => {
    if (!selectedMachineId || !thread) {
      return;
    }
    await window.diodati.cancelChat(selectedMachineId, thread.id);
  };

  const terminalSessions = useMemo(() => {
    return catalogs
      .filter((catalog) => openedTerminalIds.includes(catalog.machine.id))
      .map((catalog) => ({ id: catalog.machine.id, name: catalog.machine.name }));
  }, [catalogs, openedTerminalIds]);

  const toggleTerminal = (machineId: string) => {
    if (terminalOpen && selectedMachineId === machineId) {
      setTerminalOpen(false);
      return;
    }
    if (machineId !== selectedMachineId) {
      void selectMachine(machineId);
    }
    setOpenedTerminalIds((ids) => {
      if (ids.includes(machineId)) {
        return ids;
      }
      return [...ids, machineId];
    });
    setTerminalOpen(true);
  };

  const login = async () => {
    try {
      const url = await window.diodati.openMagicLogin();
      await window.diodati.setPreviewUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const terminalVisible = terminalOpen && terminalSessions.length > 0;
  let appClass = "app";
  if (!previewOpen) {
    appClass += " preview-off";
  }
  if (terminalVisible) {
    if (terminalDock === "right") {
      appClass += " dock-right";
    } else {
      appClass += " dock-bottom";
    }
  }

  return (
    <div
      className={appClass}
      style={{
        ["--sidebar-w" as string]: `${layout.sidebarWidth}px`,
        ["--preview-w" as string]: `${layout.previewWidth}px`,
        ["--term-h" as string]: `${layout.terminalBottom}px`,
        ["--term-w" as string]: `${layout.terminalRight}px`,
      }}
    >
      <Sidebar
        catalogs={catalogs}
        loadingMachines={loadingMachines}
        selectedMachineId={selectedMachineId}
        selectedThreadId={thread?.id ?? null}
        settingsOpen={settingsOpen}
        terminalOpen={terminalOpen}
        onOpenSettings={() => setSettingsOpen((open) => !open)}
        width={layout.sidebarWidth}
        onResizeStart={() => layout.sidebarWidth}
        onResize={(width) => {
          setLayout((current) => {
            return {
              ...current,
              sidebarWidth: Math.min(560, Math.max(160, width)),
            };
          });
        }}
        onResizeEnd={() => {
          setLayout((current) => {
            writeLayoutSizes(current);
            return current;
          });
        }}
        onRefreshMachines={() => void refreshMachines()}
        onSelectMachine={(id) => {
          setSettingsOpen(false);
          void selectMachine(id);
        }}
        onSelectThread={(item) => {
          setSettingsOpen(false);
          void selectThread(item);
        }}
        onNewThread={(id) => {
          setSettingsOpen(false);
          void beginNewThread(id);
        }}
        onOpenTerminal={(id) => toggleTerminal(id)}
      />
      <div className="chat">
        {settingsOpen ? (
          <SettingsPage
            theme={theme}
            onTheme={applyTheme}
            terminalDock={terminalDock}
            onTerminalDock={applyTerminalDock}
            onClose={() => setSettingsOpen(false)}
          />
        ) : null}
        {settingsOpen ? null : (
          <>
            <ChatPane
              machineName={selectedMachine?.name ?? null}
              homeDir={selectedCatalog?.homeDir ?? null}
              thread={thread}
              composing={composing}
              draftCwd={draftCwd}
              messages={messages}
              liveDelta={liveDelta}
              error={error}
              onNewThread={() => {
                if (selectedMachineId) {
                  void beginNewThread(selectedMachineId);
                }
              }}
              onOpenTerminal={() => {
                if (selectedMachineId) {
                  toggleTerminal(selectedMachineId);
                }
              }}
              previewOpen={previewOpen}
              onTogglePreview={() => setPreviewOpen((open) => !open)}
              terminalOpen={terminalOpen}
              onClearError={() => setError(null)}
            />
            {selectedMachineId ? (
              <Composer
                text={text}
                models={models}
                modelId={modelId}
                thinkingLevel={thinkingLevel}
                machineId={selectedMachineId}
                homeDir={selectedCatalog?.homeDir ?? null}
                folders={folders}
                cwd={activeCwd}
                showFolder={!thread || Boolean(thread.isDraft)}
                working={working}
                disabled={false}
                onText={setText}
                onCwd={setDraftCwd}
                onModel={async (nextModel) => {
                  setModelId(nextModel);
                  if (selectedMachineId && thread && !thread.isDraft) {
                    await window.diodati.switchModel(selectedMachineId, thread.id, {
                      ...composerOptions,
                      model: nextModel,
                    });
                  }
                }}
                onThinking={setThinkingLevel}
                onSend={() => void send()}
                onCancel={() => void cancel()}
              />
            ) : null}
          </>
        )}
      </div>
      {terminalSessions.length > 0 && selectedMachineId ? (
        <TerminalPane
          sessions={terminalSessions}
          activeMachineId={selectedMachineId}
          visible={terminalVisible}
          theme={theme}
          dock={terminalDock}
          onHide={() => setTerminalOpen(false)}
          onError={(message) => markMachineError(selectedMachineId, message)}
          onResizeStart={() => {
            setDragBlocksPreview(true);
            return terminalDock === "right" ? layout.terminalRight : layout.terminalBottom;
          }}
          onResize={(size) => {
            setLayout((current) => {
              if (terminalDock === "right") {
                return {
                  ...current,
                  terminalRight: Math.min(1200, Math.max(240, size)),
                };
              }
              return {
                ...current,
                terminalBottom: Math.min(800, Math.max(140, size)),
              };
            });
          }}
          onResizeEnd={() => {
            setDragBlocksPreview(false);
            setLayout((current) => {
              writeLayoutSizes(current);
              return current;
            });
          }}
        />
      ) : null}
      <PreviewPane
        url={selectedMachine?.httpsUrl ?? ""}
        visible={previewOpen && Boolean(selectedMachine)}
        suspendEmbed={dragBlocksPreview}
        loggedIn={previewLoggedIn}
        onToggle={() => setPreviewOpen(false)}
        onLogin={() => void login()}
        onOpenExternal={() => {
          if (selectedMachine) {
            void window.diodati.openExternal(selectedMachine.httpsUrl);
          }
        }}
        onResizeStart={() => {
          setDragBlocksPreview(true);
          return layout.previewWidth;
        }}
        onResize={(width) => {
          setLayout((current) => {
            return {
              ...current,
              previewWidth: Math.min(1200, Math.max(240, width)),
            };
          });
        }}
        onResizeEnd={() => {
          setDragBlocksPreview(false);
          setLayout((current) => {
            writeLayoutSizes(current);
            return current;
          });
        }}
      />
    </div>
  );
}
