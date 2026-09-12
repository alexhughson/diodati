import type { ExeConnectKind } from "@domain/exeConnect";

type Props = {
  kind: ExeConnectKind;
  message: string;
  onRescan: () => void;
  onOpenSite: () => void;
  rescanning: boolean;
};

export function ExeConnectPage(props: Props) {
  if (props.kind === "other") {
    return (
      <section className="chat-main">
        <header className="chat-header">
          <div>
            <h2>Could not list machines</h2>
            <p>SSH did not return a machine list.</p>
          </div>
        </header>
        <div className="settings-body machine-form">
          <div className="settings-block">
            <h3>Error</h3>
            <pre className="command">{props.message}</pre>
          </div>
          <div className="machine-form-actions">
            <button className="ghost" disabled={props.rescanning} onClick={props.onRescan}>
              {props.rescanning ? "rescanning…" : "rescan machines"}
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="chat-main">
      <header className="chat-header">
        <div>
          <h2>exe.dev does not know this computer</h2>
          <p>Diodati lists machines with SSH. This computer has no key that exe.dev accepts.</p>
        </div>
      </header>
      <div className="settings-body machine-form">
        <div className="settings-block">
          <h3>Register in a terminal</h3>
          <p>Run this command. Finish the register prompt if exe.dev asks for one.</p>
          <pre className="command">ssh exe.dev</pre>
          <p>Then rescan this list.</p>
        </div>
        <div className="machine-form-actions">
          <button className="ghost" disabled={props.rescanning} onClick={props.onRescan}>
            {props.rescanning ? "rescanning…" : "rescan machines"}
          </button>
          <button className="ghost" onClick={props.onOpenSite}>
            open exe.dev profile
          </button>
        </div>
        <div className="settings-block">
          <h3>If you already have an account</h3>
          <p>Add this computer's public key on your exe.dev profile, or pin the right key in ~/.ssh/config.</p>
        </div>
      </div>
    </section>
  );
}
