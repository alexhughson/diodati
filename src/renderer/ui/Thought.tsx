import { useState } from "react";

type Props = {
  text: string;
};

export function Thought(props: Props) {
  const [open, setOpen] = useState(false);
  const summary = firstLine(props.text);

  return (
    <button
      className={open ? "thought open" : "thought"}
      title="thought"
      onClick={() => setOpen(!open)}
    >
      <span className="thought-head">
        <span className="thought-label">thought</span>
        {open ? null : <span className="thought-summary">{summary}</span>}
      </span>
      {open ? <span className="thought-body">{props.text}</span> : null}
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
