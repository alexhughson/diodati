import { useEffect, useState } from "react";
import { completeSlashCommand, matchingSlashCommands, slashToken } from "@domain/slash";
import type { FolderChoice } from "@domain/catalog";
import type { Model, ReasoningLevel } from "@shared/types";
import { FolderPicker } from "./FolderPicker";
import { ModelPicker } from "./ModelPicker";

type Props = {
  text: string;
  models: Model[];
  modelId: string;
  thinkingLevel: ReasoningLevel | null;
  machineId: string;
  homeDir: string | null;
  folders: FolderChoice[];
  cwd: string | null;
  showFolder: boolean;
  working: boolean;
  disabled: boolean;
  onText: (text: string) => void;
  onModel: (modelId: string) => void;
  onThinking: (level: ReasoningLevel | null) => void;
  onCwd: (cwd: string) => void;
  onSend: () => void;
  onCancel: () => void;
};

export function Composer(props: Props) {
  const matches = matchingSlashCommands(props.text);
  const token = slashToken(props.text);
  const exactAlone = matches.length === 1 && matches[0]?.command === `/${token}`;
  const [highlight, setHighlight] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const showMenu = token !== null && matches.length > 0 && !exactAlone && !dismissed && !props.disabled;
  const active = matches.length === 0 ? 0 : Math.min(highlight, matches.length - 1);

  useEffect(() => {
    setHighlight(0);
    setDismissed(false);
  }, [token]);

  const complete = (index: number) => {
    const command = matches[index];
    if (!command) {
      return;
    }
    props.onText(completeSlashCommand(command));
  };

  return (
    <div className="composer">
      <div className="composer-box">
        {showMenu ? (
          <div className="slash-menu" role="listbox" aria-label="commands">
            {matches.map((item, index) => (
              <button
                key={item.command}
                type="button"
                role="option"
                aria-selected={index === active}
                className={index === active ? "pop-item active" : "pop-item"}
                onMouseDown={(event) => {
                  event.preventDefault();
                  complete(index);
                }}
              >
                <span>{item.command}</span>
                <span className="src">{item.description}</span>
              </button>
            ))}
          </div>
        ) : null}
        <textarea
          value={props.text}
          placeholder="Message Shelley on this machine"
          disabled={props.disabled}
          onChange={(event) => props.onText(event.target.value)}
          onKeyDown={(event) => {
            if (showMenu && event.key === "ArrowDown") {
              event.preventDefault();
              setHighlight((current) => (current + 1) % matches.length);
              return;
            }
            if (showMenu && event.key === "ArrowUp") {
              event.preventDefault();
              setHighlight((current) => (current - 1 + matches.length) % matches.length);
              return;
            }
            if (showMenu && event.key === "Escape") {
              event.preventDefault();
              setDismissed(true);
              return;
            }
            if (showMenu && event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              complete(active);
              return;
            }
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              props.onSend();
            }
          }}
        />
        <div className="composer-bar">
          <div className="chip-row">
            <ModelPicker
              models={props.models}
              modelId={props.modelId}
              thinkingLevel={props.thinkingLevel}
              onModel={props.onModel}
              onThinking={props.onThinking}
            />
            {props.showFolder ? (
              <FolderPicker
                machineId={props.machineId}
                homeDir={props.homeDir}
                choices={props.folders}
                cwd={props.cwd}
                onCwd={props.onCwd}
              />
            ) : null}
          </div>
          {props.working ? (
            <button className="ghost" onClick={props.onCancel}>
              stop
            </button>
          ) : (
            <button className="send" onClick={props.onSend} disabled={props.disabled || props.text.trim().length === 0}>
              send
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
