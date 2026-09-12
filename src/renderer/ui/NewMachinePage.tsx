import { useState } from "react";
import { firstErrorLine } from "@domain/exeConnect";

type Props = {
  onCreate: (name: string | null) => Promise<void>;
  onClose: () => void;
};

export function NewMachinePage(props: Props) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const trimmed = name.trim();
    setBusy(true);
    setError(null);
    try {
      await props.onCreate(trimmed.length === 0 ? null : trimmed);
      setName("");
    } catch (err) {
      setError(firstErrorLine(err instanceof Error ? err.message : String(err)));
    }
    setBusy(false);
  };

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

