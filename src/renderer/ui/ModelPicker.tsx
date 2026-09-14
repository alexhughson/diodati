import { useState } from "react";
import type { Model, ReasoningLevel } from "@shared/types";
import { Pop } from "./Pop";

type Props = {
  models: Model[];
  modelId: string;
  thinkingLevel: ReasoningLevel | null;
  onModel: (modelId: string) => void;
  onThinking: (level: ReasoningLevel | null) => void;
  onRefreshModels: () => void;
};

export function ModelPicker(props: Props) {
  const [open, setOpen] = useState<"model" | "think" | null>(null);
  const [more, setMore] = useState(false);
  const selected = props.models.find((model) => model.id === props.modelId) ?? null;
  const visible = props.models.filter((model) => more || model.tier === 1);

  return (
    <div className="picker-row">
      <Pop open={open === "model"} onClose={() => setOpen(null)}>
        <button className="chip active" onClick={() => setOpen(open === "model" ? null : "model")}>
          {selected ? selected.displayName : "model"}
        </button>
        {open === "model" ? (
          <div className="pop-menu">
            {visible.map((model) => (
              <button
                key={model.id}
                className={model.id === props.modelId ? "pop-item active" : "pop-item"}
                onClick={() => {
                  props.onModel(model.id);
                  if (model.defaultReasoningLevel) {
                    props.onThinking(model.defaultReasoningLevel);
                  }
                  setOpen(null);
                }}
              >
                <span>{model.displayName}</span>
                <span className="src">{model.source}</span>
              </button>
            ))}
            <button
              className="pop-item"
              onClick={() => {
                const next = !more;
                setMore(next);
                if (next) {
                  props.onRefreshModels();
                }
              }}
            >
              {more ? "fewer models" : "more models"}
            </button>
          </div>
        ) : null}
      </Pop>
      {selected && (selected.supportsReasoning || selected.reasoningLevels.length > 0) ? (
        <Pop open={open === "think"} onClose={() => setOpen(null)}>
          <button className="chip" onClick={() => setOpen(open === "think" ? null : "think")}>
            think {props.thinkingLevel ?? "default"}
          </button>
          {open === "think" ? (
            <div className="pop-menu pop-menu-narrow">
              <button
                className={props.thinkingLevel === null ? "pop-item active" : "pop-item"}
                onClick={() => {
                  props.onThinking(null);
                  setOpen(null);
                }}
              >
                default
              </button>
              {selected.reasoningLevels.map((level) => (
                <button
                  key={level}
                  className={props.thinkingLevel === level ? "pop-item active" : "pop-item"}
                  onClick={() => {
                    props.onThinking(level);
                    setOpen(null);
                  }}
                >
                  {level}
                </button>
              ))}
            </div>
          ) : null}
        </Pop>
      ) : null}
    </div>
  );
}
