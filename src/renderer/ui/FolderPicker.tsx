import { useEffect, useState } from "react";
import type { FolderChoice } from "@domain/catalog";
import { displayFolder } from "@domain/thread";
import { joinDir, parentDir } from "@domain/remotePath";
import { Pop } from "./Pop";

type Props = {
  machineId: string;
  homeDir: string | null;
  choices: FolderChoice[];
  cwd: string | null;
  onCwd: (cwd: string) => void;
};

export function FolderPicker(props: Props) {
  const [open, setOpen] = useState(false);
  const [browsePath, setBrowsePath] = useState(props.cwd ?? props.homeDir ?? "/");
  const [names, setNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createName, setCreateName] = useState("");
  const selected = props.choices.find((choice) => choice.cwd === props.cwd) ?? null;
  const label = selected ? selected.label : props.cwd ? displayFolder(props.cwd, props.homeDir) : "folder";
  const parent = parentDir(browsePath);

  useEffect(() => {
    if (!open) {
      return;
    }
    let alive = true;
    setLoading(true);
    setError(null);
    void window.diodati
      .listRemoteDirs(props.machineId, browsePath)
      .then((dirs) => {
        if (!alive) {
          return;
        }
        setNames(dirs);
        setLoading(false);
      })
      .catch((err) => {
        if (!alive) {
          return;
        }
        setNames([]);
        setLoading(false);
        setError(err instanceof Error ? err.message.split("\n")[0] : String(err));
      });
    return () => {
      alive = false;
    };
  }, [open, props.machineId, browsePath]);

  const useCurrent = () => {
    props.onCwd(browsePath);
    setOpen(false);
  };

  const createFolder = async () => {
    const name = createName.trim();
    if (name.length === 0) {
      return;
    }
    try {
      const created = await window.diodati.createRemoteDir(props.machineId, joinDir(browsePath, name));
      setCreateName("");
      setBrowsePath(created);
    } catch (err) {
      setError(err instanceof Error ? err.message.split("\n")[0] : String(err));
    }
  };

  return (
    <Pop
      open={open}
      onClose={() => {
        setOpen(false);
        setCreateName("");
      }}
    >
      <button
        className="chip"
        title="choose folder"
        onClick={() => {
          if (!open) {
            setBrowsePath(props.cwd ?? props.homeDir ?? "/");
          }
          setOpen(!open);
        }}
      >
        {label}
      </button>
      {open ? (
        <div className="pop-menu folder-browser">
          <div className="folder-now">
            <span title={browsePath}>{displayFolder(browsePath, props.homeDir)}</span>
            <button className="ghost" title="use this folder" onClick={useCurrent}>
              use
            </button>
          </div>
          {props.choices.length > 0 ? (
            <div className="folder-shortcuts">
              {props.choices.map((choice) => (
                <button
                  key={choice.cwd}
                  className={choice.cwd === browsePath ? "ghost active" : "ghost"}
                  title={choice.cwd}
                  onClick={() => setBrowsePath(choice.cwd)}
                >
                  {choice.label}
                </button>
              ))}
            </div>
          ) : null}
          <div className="folder-list">
            {parent ? (
              <button className="pop-item" title={parent} onClick={() => setBrowsePath(parent)}>
                ..
              </button>
            ) : null}
            {loading ? <div className="folder-status">reading folders…</div> : null}
            {error ? <div className="folder-status error">{error}</div> : null}
            {!loading
              ? names.map((name) => (
                  <button
                    key={name}
                    className="pop-item"
                    title={joinDir(browsePath, name)}
                    onClick={() => setBrowsePath(joinDir(browsePath, name))}
                  >
                    {name}
                  </button>
                ))
              : null}
            {!loading && !error && names.length === 0 ? <div className="folder-status">no folders here</div> : null}
          </div>
          <form
            className="pop-custom"
            onSubmit={(event) => {
              event.preventDefault();
              void createFolder();
            }}
          >
            <input
              value={createName}
              placeholder="new folder name"
              onChange={(event) => setCreateName(event.target.value)}
            />
            <button type="submit" className="ghost" title="create folder">
              create folder
            </button>
          </form>
        </div>
      ) : null}
    </Pop>
  );
}
