import { useEffect, useMemo, useRef, useState } from "react";
import { folderChoices, upsertThreadInCatalogs } from "@domain/catalog";
import { maxContextTokensFor } from "@domain/contextUsage";
import { classifyExeConnectError, firstErrorLine, type ExeConnectKind } from "@domain/exeConnect";
import { pickModelOnList } from "@domain/model";
import { machineIds, sortCatalogs, syncManualOrder, type SidebarSort } from "@domain/sidebarOrder";
import type { MachineCatalog, Model, ProjectedMessage, ReasoningLevel, Thread } from "@shared/types";
import { ChatPane } from "./ui/ChatPane";
import { Composer } from "./ui/Composer";
import { PreviewPane } from "./ui/PreviewPane";
import { ExeConnectPage } from "./ui/ExeConnectPage";
import { NewMachinePage } from "./ui/NewMachinePage";
import { SettingsPage } from "./ui/SettingsPage";
import { Sidebar } from "./ui/Sidebar";
import { TerminalPane } from "./ui/TerminalPane";
import {
  defaultLayoutSizes,
  readCollapsedMachines,
  readLayoutSizes,
  readManualOrder,
  readSidebarSort,
  readTerminalDock,
  writeCollapsedMachines,
  writeLayoutSizes,
  writeManualOrder,
  writeSidebarSort,
  writeTerminalDock,
  type LayoutSizes,
  type TerminalDock,
} from "./ui/prefs";
import { readTheme, writeTheme, type ThemeId } from "./ui/themes";

export function App() {
  const [catalogs, setCatalogs] = useState<MachineCatalog[]>([]);
  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(null);
  const [modelsByMachine, setModelsByMachine] = useState<Record<string, Model[]>>({});
  const [thread, setThread] = useState<Thread | null>(null);
  const [composing, setComposing] = useState(false);
  const [draftCwd, setDraftCwd] = useState<string | null>(null);
  const [messages, setMessages] = useState<ProjectedMessage[]>([]);
  const [modelId, setModelId] = useState("");
  const [thinkingLevel, setThinkingLevel] = useState<ReasoningLevel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [liveDelta, setLiveDelta] = useState("");
  const [liveThought, setLiveThought] = useState("");
  const [contextWindowSize, setContextWindowSize] = useState(0);
  const [hideContextPromptFor, setHideContextPromptFor] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoggedIn, setPreviewLoggedIn] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [createMachineOpen, setCreateMachineOpen] = useState(false);
  const [connectKind, setConnectKind] = useState<ExeConnectKind | null>(null);
  const [connectMessage, setConnectMessage] = useState<string | null>(null);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [openedTerminalIds, setOpenedTerminalIds] = useState<string[]>([]);
  const [loadingMachines, setLoadingMachines] = useState(true);
  const [theme, setTheme] = useState<ThemeId>("paper");
  const [terminalDock, setTerminalDock] = useState<TerminalDock>("bottom");
  const [layout, setLayout] = useState<LayoutSizes>(defaultLayoutSizes);
  const [sidebarSort, setSidebarSort] = useState<SidebarSort>("manual");
  const [manualOrder, setManualOrder] = useState<string[]>([]);
  const [collapsedIds, setCollapsedIds] = useState<string[]>([]);
  const [dragBlocksPreview, setDragBlocksPreview] = useState(false);

  const selectedCatalog = useMemo(() => {
    return catalogs.find((catalog) => catalog.machine.id === selectedMachineId) ?? null;
  }, [catalogs, selectedMachineId]);
  const selectedMachine = selectedCatalog?.machine ?? null;

  const selectedMachineRef = useRef(selectedMachineId);
  selectedMachineRef.current = selectedMachineId;
  const modelIdRef = useRef(modelId);
  modelIdRef.current = modelId;
  const machineModels = selectedMachineId ? (modelsByMachine[selectedMachineId] ?? []) : [];
  const folders = selectedCatalog ? folderChoices(selectedCatalog) : [];
  const activeCwd = thread?.cwd ?? draftCwd;
  const composerOptions = {
    model: modelId,
    cwd: activeCwd,
    thinkingLevel,
  };
  const maxContextTokens = maxContextTokensFor(machineModels, modelId);

  useEffect(() => {
    const next = readTheme();
    setTheme(next);
    document.documentElement.dataset.theme = next;
    setTerminalDock(readTerminalDock());
    setLayout(readLayoutSizes());
    setSidebarSort(readSidebarSort());
    setManualOrder(readManualOrder());
    setCollapsedIds(readCollapsedMachines());
  }, []);

  const refreshMachines = async (): Promise<MachineCatalog[]> => {
    setLoadingMachines(true);
    try {
      await window.diodati.listMachines();
      const nextCatalogs = await window.diodati.loadAllCatalogs();
      setCatalogs(nextCatalogs);
      setConnectKind(null);
      setConnectMessage(null);
      if (selectedMachineId && !nextCatalogs.some((catalog) => catalog.machine.id === selectedMachineId)) {
        resetChat();
        setSelectedMachineId(null);
      }
      setLoadingMachines(false);
      return nextCatalogs;
    } catch (err) {
      const message = firstErrorLine(err instanceof Error ? err.message : String(err));
      setCatalogs([]);
      setConnectKind(classifyExeConnectError(message));
      setConnectMessage(message);
      setLoadingMachines(false);
      return [];
    }
  };

  useEffect(() => {
    let cancelled = false;
    const boot = async () => {
      const scene = await window.diodati.demoScene();
      if (cancelled) {
        return;
      }
      if (scene) {
        document.documentElement.dataset.theme = "paper";
        setTheme("paper");
        setTerminalDock("bottom");
        setLayout(defaultLayoutSizes);
        setCollapsedIds([]);
      }
      const nextCatalogs = await refreshMachines();
      if (cancelled || !scene) {
        return;
      }
      const catalog = nextCatalogs.find((item) => item.machine.id === scene.machineId);
      const item = catalog?.threads.find((entry) => entry.id === scene.threadId);
      if (!item) {
        throw new Error(`demo scene thread missing: ${scene.machineId} ${scene.threadId}`);
      }
      await selectThread(item, nextCatalogs);
      if (cancelled) {
        return;
      }
      if (document.fonts) {
        await document.fonts.ready;
      }
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            resolve();
          });
        });
      });
      await window.diodati.demoReady();
    };
    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    const email = selectedMachine?.accountEmail;
    if (!email) {
      setPreviewLoggedIn(false);
      return;
    }
    void window.diodati.previewLoggedIn(email).then((loggedIn) => {
      if (alive) {
        setPreviewLoggedIn(loggedIn);
      }
    });
    const stop = window.diodati.onPreviewAuth((event) => {
      if (event.email === email) {
        setPreviewLoggedIn(event.loggedIn);
      }
    });
    return () => {
      alive = false;
      stop();
    };
  }, [selectedMachine?.accountEmail]);

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
          setLiveThought("");
        }
        return;
      }
      if (event.kind === "delta") {
        if (thread && event.threadId === thread.id) {
          if (event.type === "thinking") {
            setLiveThought((current) => current + event.text);
            return;
          }
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
        return;
      }
      if (event.kind === "context") {
        if (thread && event.threadId === thread.id) {
          setContextWindowSize(event.tokens);
        }
      }
    });
  }, [thread]);

  useEffect(() => {
    if (!selectedMachine || !previewOpen) {
      return;
    }
    let cancelled = false;
    void window.diodati
      .setPreviewUrl({
        url: selectedMachine.httpsUrl,
        accountEmail: selectedMachine.accountEmail,
        identityFile: selectedMachine.identityFile,
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      });
    return () => {
      cancelled = true;
    };
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
    setLiveThought("");
    setContextWindowSize(0);
    setHideContextPromptFor(null);
    setWorking(false);
    setError(null);
    setComposing(false);
  };

  const rememberModels = (machineId: string, nextModels: Model[]) => {
    setModelsByMachine((current) => {
      const next: Record<string, Model[]> = {};
      for (const id of Object.keys(current)) {
        const models = current[id];
        if (models) {
          next[id] = models;
        }
      }
      next[machineId] = nextModels;
      return next;
    });
  };

  const defaultCwd = (machineId: string, source: MachineCatalog[] = catalogs): string | null => {
    const catalog = source.find((item) => item.machine.id === machineId);
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

  const ensureModels = async (machineId: string, source: MachineCatalog[] = catalogs) => {
    const machine = source.find((item) => item.machine.id === machineId)?.machine;
    if (!machine || !machine.canShell) {
      rememberModels(machineId, []);
      return;
    }
    try {
      const nextModels = await window.diodati.listModels(machineId);
      rememberModels(machineId, nextModels);
      markMachineError(machineId, null);
      if (selectedMachineRef.current !== machineId) {
        return;
      }
      const chosen = pickModelOnList(nextModels, modelIdRef.current);
      if (!chosen) {
        setModelId("");
        return;
      }
      if (chosen.id !== modelIdRef.current) {
        setModelId(chosen.id);
        setThinkingLevel(chosen.defaultReasoningLevel);
      }
    } catch (err) {
      rememberModels(machineId, []);
      markMachineError(machineId, err instanceof Error ? err.message : String(err));
    }
  };

  const selectMachine = async (machineId: string, source: MachineCatalog[] = catalogs) => {
    if (machineId !== selectedMachineId) {
      resetChat();
      setDraftCwd(defaultCwd(machineId, source));
    }
    setSelectedMachineId(machineId);
    selectedMachineRef.current = machineId;
    await ensureModels(machineId, source);
  };

  const createMachine = async (name: string | null, identityFile: string | null) => {
    setError(null);
    const created = await window.diodati.createMachine(name, identityFile);
    const nextCatalogs = await refreshMachines();
    setCreateMachineOpen(false);
    await selectMachine(created.id, nextCatalogs);
  };

  const closeCenterPages = () => {
    setSettingsOpen(false);
    setCreateMachineOpen(false);
  };

  const beginNewThread = async (machineId: string) => {
    resetChat();
    setSelectedMachineId(machineId);
    selectedMachineRef.current = machineId;
    setComposing(true);
    setDraftCwd(defaultCwd(machineId));
    await ensureModels(machineId);
  };

  const selectThread = async (next: Thread, source: MachineCatalog[] = catalogs) => {
    setError(null);
    setComposing(false);
    setSelectedMachineId(next.machineId);
    selectedMachineRef.current = next.machineId;
    setThread(next);
    setLiveDelta("");
    setLiveThought("");
    setContextWindowSize(0);
    setHideContextPromptFor(null);
    setMessages([]);
    if (next.model) {
      setModelId(next.model);
      modelIdRef.current = next.model;
    }
    if (next.cwd) {
      setDraftCwd(next.cwd);
    }
    try {
      await ensureModels(next.machineId, source);
      const opened = await window.diodati.openThread(next.machineId, next.id);
      setThread(opened.thread);
      setMessages(opened.messages);
      setContextWindowSize(opened.contextWindowSize);
      setWorking(opened.thread.working);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const send = async (message: string) => {
    if (!selectedMachineId || !modelId || message.trim().length === 0) {
      return;
    }
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

  const compactThread = async () => {
    if (!selectedMachineId || !thread) {
      return;
    }
    setHideContextPromptFor(thread.id);
    setContextWindowSize(0);
    await send("/compact");
  };

  const newGeneration = async () => {
    if (!selectedMachineId || !thread) {
      return;
    }
    setError(null);
    setHideContextPromptFor(thread.id);
    setContextWindowSize(0);
    try {
      const next = await window.diodati.startNewGeneration(selectedMachineId, thread.id);
      setThread(next);
      setCatalogs((existing) => upsertThreadInCatalogs(existing, next));
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
    if (!selectedMachine) {
      return;
    }
    try {
      await window.diodati.setPreviewUrl({
        url: selectedMachine.httpsUrl,
        accountEmail: selectedMachine.accountEmail,
        identityFile: selectedMachine.identityFile,
        forceLogin: true,
      });
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

  let connectHint: string | null = null;
  if (connectKind === "needs-key") {
    connectHint = "no exe.dev key on this computer";
  } else if (connectKind === "other") {
    connectHint = "could not list machines";
  }
  const showConnect = Boolean(connectKind) && catalogs.length === 0 && !settingsOpen && !createMachineOpen;

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
        connectHint={connectHint}
        selectedMachineId={selectedMachineId}
        selectedThreadId={thread?.id ?? null}
        settingsOpen={settingsOpen}
        createMachineOpen={createMachineOpen}
        terminalOpen={terminalOpen}
        onOpenSettings={() => {
          setCreateMachineOpen(false);
          setSettingsOpen((open) => !open);
        }}
        onOpenCreateMachine={() => {
          setSettingsOpen(false);
          setCreateMachineOpen((open) => !open);
        }}
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
          closeCenterPages();
          void selectMachine(id);
        }}
        onSelectThread={(item) => {
          closeCenterPages();
          void selectThread(item);
        }}
        onNewThread={(id) => {
          closeCenterPages();
          void beginNewThread(id);
        }}
        onOpenTerminal={(id) => toggleTerminal(id)}
        sidebarSort={sidebarSort}
        manualOrder={manualOrder}
        onSidebarSort={(next) => {
          if (next === "manual") {
            if (manualOrder.length === 0) {
              const fromView = machineIds(sortCatalogs(catalogs, sidebarSort, []));
              setManualOrder(fromView);
              writeManualOrder(fromView);
            } else {
              const synced = syncManualOrder(manualOrder, catalogs);
              setManualOrder(synced);
              writeManualOrder(synced);
            }
          }
          setSidebarSort(next);
          writeSidebarSort(next);
        }}
        onManualOrder={(order) => {
          setManualOrder(order);
          writeManualOrder(order);
        }}
        collapsedIds={collapsedIds}
        onToggleCollapsed={(machineId) => {
          setCollapsedIds((current) => {
            const next: string[] = [];
            let found = false;
            for (const id of current) {
              if (id === machineId) {
                found = true;
                continue;
              }
              next.push(id);
            }
            if (!found) {
              next.push(machineId);
            }
            writeCollapsedMachines(next);
            return next;
          });
        }}
      />
      <div className="chat">
        {settingsOpen ? (
          <SettingsPage
            theme={theme}
            onTheme={applyTheme}
            terminalDock={terminalDock}
            onTerminalDock={applyTerminalDock}
            onKeysChanged={() => void refreshMachines()}
            onClose={() => setSettingsOpen(false)}
          />
        ) : null}
        {createMachineOpen ? (
          <NewMachinePage onCreate={createMachine} onClose={() => setCreateMachineOpen(false)} />
        ) : null}
        {showConnect && connectKind ? (
          <ExeConnectPage
            kind={connectKind}
            message={connectMessage ?? ""}
            onRescan={() => void refreshMachines()}
            rescanning={loadingMachines}
            onOpenSite={() => {
              void window.diodati.openExternal("https://exe.dev/user");
            }}
          />
        ) : null}
        {settingsOpen || createMachineOpen || showConnect || (loadingMachines && catalogs.length === 0) ? null : (
          <>
            <ChatPane
              machineName={selectedMachine?.name ?? null}
              homeDir={selectedCatalog?.homeDir ?? null}
              thread={thread}
              composing={composing}
              draftCwd={draftCwd}
              messages={messages}
              liveDelta={liveDelta}
              liveThought={liveThought}
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
                key={`${selectedMachineId}:${thread?.id ?? "draft"}`}
                models={machineModels}
                modelId={modelId}
                thinkingLevel={thinkingLevel}
                machineId={selectedMachineId}
                homeDir={selectedCatalog?.homeDir ?? null}
                folders={folders}
                cwd={activeCwd}
                showFolder={!thread || Boolean(thread.isDraft)}
                working={working}
                disabled={false}
                contextTokens={contextWindowSize}
                maxContextTokens={maxContextTokens}
                showContextPrompt={
                  Boolean(thread) && hideContextPromptFor !== thread?.id
                }
                onCompact={() => void compactThread()}
                onNewGeneration={() => void newGeneration()}
                onDismissContextPrompt={() => {
                  if (thread) {
                    setHideContextPromptFor(thread.id);
                  }
                }}
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
                onRefreshModels={() => {
                  void ensureModels(selectedMachineId);
                }}
                onSend={(message) => void send(message)}
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
