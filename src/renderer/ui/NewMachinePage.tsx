import { useEffect, useState } from "react";
import { firstErrorLine } from "@domain/exeConnect";
import { identityKey } from "@domain/exeAccount";
import type { ExeAccountProbe } from "@shared/types";

type Props = {
  onCreate: (name: string | null, identityFile: string | null) => Promise<void>;
  onClose: () => void;
};

export function NewMachinePage(props: Props) {
  const [name, setName] = useState("");
  const [accounts, setAccounts] = useState<ExeAccountProbe[]>([]);
  const [identityFile, setIdentityFile] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const probes = await window.diodati.probeAccounts();
        const ssh = await window.diodati.getSshSettings();
        if (cancelled) {
          return;
        }
        const ready: ExeAccountProbe[] = [];
        for (const probe of probes) {
          if (!probe.email) {
            continue;
          }
          if (!ssh.activeIdentityKeys.includes(identityKey(probe.identityFile))) {
            continue;
          }
          ready.push(probe);
        }
        setAccounts(ready);
        const first = ready[0];
        if (first) {
          setIdentityFile(first.identityFile);
        }
      } catch (err) {
        if (!cancelled) {
          setError(firstErrorLine(err instanceof Error ? err.message : String(err)));
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const submit = async () => {
    const trimmed = name.trim();
    setBusy(true);
    setError(null);
    try {
      await props.onCreate(trimmed.length === 0 ? null : trimmed, identityFile);
      setName("");
    } catch (err) {
      setError(firstErrorLine(err instanceof Error ? err.message : String(err)));
    }
    setBusy(false);
  };

  const showAccountPicker = accounts.length > 1;

  return (
    <section className="chat-main">
      <header className="chat-header">
        <div>
          <h2>New machine</h2>
          <p>exe.dev creates a VM. Leave the name empty to let it pick one.</p>
        </div>
        <button className="ghost" disabled={busy} onClick={props.onClose}>
          back
        </button>
      </header>
      <form
        className="settings-body machine-form"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        {showAccountPicker ? (
          <div className="settings-block">
            <h3>Account</h3>
            <p>Which exe.dev account should own the machine</p>
            <select
              disabled={busy}
              value={identityKey(identityFile)}
              onChange={(event) => {
                const key = event.target.value;
                if (key === "default") {
                  setIdentityFile(null);
                  return;
                }
                setIdentityFile(key);
              }}
            >
              {accounts.map((account) => (
                <option key={identityKey(account.identityFile)} value={identityKey(account.identityFile)}>
                  {account.email}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="settings-block">
          <h3>Name</h3>
          <p>Lowercase letter, then letters, digits, or hyphens</p>
          <input
            autoFocus
            value={name}
            disabled={busy}
            placeholder="name (optional)"
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className="machine-form-actions">
          <button type="submit" className="ghost" disabled={busy} title="create machine">
            {busy ? "creating…" : "create"}
          </button>
        </div>
        {error ? <div className="folder-status error">{error}</div> : null}
      </form>
    </section>
  );
}
