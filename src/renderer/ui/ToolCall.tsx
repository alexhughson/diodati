import { useState } from "react";
import { patchSummary } from "@domain/patch";
import type { PatchView } from "@shared/types";

type Props = {
  name: string;
  inputText: string;
  outputText: string;
  running: boolean;
  errored: boolean;
  patch?: PatchView;
};

export function ToolCall(props: Props) {
  const [open, setOpen] = useState(false);
  const status = props.running ? "running" : props.errored ? "error" : "done";
  const summary = props.patch ? patchSummary(props.patch) : firstLine(props.inputText);

  return (
    <button className={open ? "tool open" : "tool"} onClick={() => setOpen(!open)}>
      <span className="tool-head">
        <span className="tool-name">{props.name}</span>
        <span className="tool-status">{status}</span>
        {summary && !open ? <span className="tool-summary">{summary}</span> : null}
      </span>
      {open ? (
        <ToolBody
          inputText={props.inputText}
          outputText={props.outputText}
          errored={props.errored}
          patch={props.patch}
        />
      ) : null}
    </button>
  );
}

function ToolBody(props: {
  inputText: string;
  outputText: string;
  errored: boolean;
  patch?: PatchView;
}) {
  if (props.patch) {
    return (
      <span className="tool-body">
        {props.patch.path ? <span className="patch-path">{props.patch.path}</span> : null}
        {props.patch.lines.length > 0 ? (
          <span className="patch-diff">
            {props.patch.lines.map((line, index) => (
              <span key={index} className={`patch-line ${line.kind}`}>
                {line.text.length === 0 ? " " : line.text}
              </span>
            ))}
          </span>
        ) : null}
        {props.errored && props.outputText ? (
          <span className="tool-part">
            <span className="tool-part-label">result</span>
            {props.outputText}
          </span>
        ) : null}
      </span>
    );
  }
  return (
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
  );
}

function firstLine(text: string): string {
  const line = text.split("\n").find((part) => part.trim().length > 0) ?? "";
  if (line.length <= 72) {
    return line;
  }
  return `${line.slice(0, 72)}…`;
}
