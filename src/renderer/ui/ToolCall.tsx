import { useState } from "react";

type Props = {
  name: string;
  inputText: string;
  outputText: string;
  running: boolean;
  errored: boolean;
};

export function ToolCall(props: Props) {
  const [open, setOpen] = useState(false);
  const status = props.running ? "running" : props.errored ? "error" : "done";
  const summary = firstLine(props.inputText);

  return (
    <button className={open ? "tool open" : "tool"} onClick={() => setOpen(!open)}>
      <span className="tool-head">
        <span className="tool-name">{props.name}</span>
        <span className="tool-status">{status}</span>
        {summary && !open ? <span className="tool-summary">{summary}</span> : null}
      </span>
      {open ? (
        <span className="tool-body">
          {props.inputText ? (
            <span className="tool-part">
              <span className="tool-part-label">input</span>
              {props.inputText}
            </span>
          ) : null}
          {props.outputText ? (
            <span className="tool-part">
              <span className="tool-part-label">result</span>
              {props.outputText}
            </span>
          ) : null}
        </span>
      ) : null}
    </button>
  );
}

function firstLine(text: string): string {
  const line = text.split("\n").find((part) => part.trim().length > 0) ?? "";
  if (line.length <= 72) {
    return line;
  }
  return `${line.slice(0, 72)}…`;
}
