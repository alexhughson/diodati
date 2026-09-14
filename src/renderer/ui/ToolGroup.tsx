import { useState } from "react";
import type { ToolBlock } from "@domain/message";
import { ToolCall } from "./ToolCall";

type Props = {
  tools: ToolBlock[];
};

export function ToolGroup(props: Props) {
  const [open, setOpen] = useState(false);
  const running = props.tools.some((tool) => tool.running);
  const errored = props.tools.some((tool) => tool.errored);
  const status = running ? "running" : errored ? "error" : "done";
  const names = props.tools.map((tool) => tool.name).join(" · ");

  return (
    <div className="tool-group">
      <button className="tool-group-head" onClick={() => setOpen(!open)}>
        <span className="tool-name">{props.tools.length} tools</span>
        <span className="tool-status">{status}</span>
        {open ? null : <span className="tool-summary">{names}</span>}
      </button>
      {open ? (
        <div className="tool-group-body">
          {props.tools.map((tool, index) => (
            <ToolCall
              key={`${tool.name}-${index}`}
              name={tool.name}
              inputText={tool.inputText}
              outputText={tool.outputText}
              running={tool.running}
              errored={tool.errored}
              patch={tool.patch}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
