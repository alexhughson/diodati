import { useEffect, useState } from "react";
import { contextUsageLevel, formatTokenCount } from "@domain/contextUsage";
import { completeSlashCommand, matchingSlashCommands, slashToken } from "@domain/slash";
import type { FolderChoice } from "@domain/catalog";
import type { Model, ReasoningLevel } from "@shared/types";
import { FolderPicker } from "./FolderPicker";
import { ModelPicker } from "./ModelPicker";

type Props = {
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
  onModel: (modelId: string) => void;
  onThinking: (level: ReasoningLevel | null) => void;
  onRefreshModels: () => void;
  onCwd: (cwd: string) => void;
  onSend: (text: string) => void;
  onCancel: () => void;
  contextTokens: number;
  maxContextTokens: number;
  showContextPrompt: boolean;
  onCompact: () => void;
  onNewGeneration: () => void;
  onDismissContextPrompt: () => void;
};

export function Composer(props: Props) {
  const [text, setText] = useState("");
  const matches = matchingSlashCommands(text);
  const token = slashToken(text);
  const exactAlone = matches.length === 1 && matches[0]?.command === `/${token}`;
  const [highlight, setHighlight] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const showMenu = token !== null && matches.length > 0 && !exactAlone && !dismissed && !props.disabled;
  const active = matches.length === 0 ? 0 : Math.min(highlight, matches.length - 1);
  const usageLevel = contextUsageLevel(props.contextTokens, props.maxContextTokens);
  const showContextPrompt = props.showContextPrompt && usageLevel !== "";

  useEffect(() => {
    setHighlight(0);
    setDismissed(false);
  }, [token]);

  const complete = (index: number) => {
    const command = matches[index];
    if (!command) {
      return;
    }
    setText(completeSlashCommand(command));
  };

  const submit = () => {
    const message = text;
    if (props.disabled || message.trim().length === 0) {
      return;
    }
    setText("");
    props.onSend(message);
  };

  return (
    <div className="composer">
      {showContextPrompt ? (
        <div className={`context-prompt ${usageLevel}`}>
          <div className="context-prompt-copy">
            <p>This conversation is getting long.</p>
            <p>Compact it or start a new generation.</p>
          </div>
          <div className="context-prompt-actions">
            <button type="button" disabled={props.working} onClick={props.onCompact}>
              Compact conversation
            </button>
            <button type="button" disabled={props.working} onClick={props.onNewGeneration}>
              Start new generation
            </button>
            <button type="button" className="ghost" onClick={props.onDismissContextPrompt}>
              hide
            </button>
          </div>
        </div>
      ) : null}
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
          value={text}
          placeholder="Message Shelley on this machine"
          disabled={props.disabled}
          onChange={(event) => setText(event.target.value)}
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
              submit();
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
              onRefreshModels={props.onRefreshModels}
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
            <span
              className={usageLevel ? `context-size ${usageLevel}` : "context-size"}
              title={contextSizeTitle(props.contextTokens, props.maxContextTokens)}
            >
              {formatTokenCount(props.contextTokens)}
            </span>
          </div>
          {props.working ? (
            <div className="working-group">
              <WorkingLabel />
              <button className="ghost" onClick={props.onCancel}>
                stop
              </button>
            </div>
          ) : (
            <button className="send" onClick={submit} disabled={props.disabled || text.trim().length === 0}>
              send
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function WorkingLabel() {
  const text = "Agent working...";
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % text.length);
    }, 100);
    return () => {
      window.clearInterval(timer);
    };
  }, []);
  return (
    <span className="working-label" aria-live="polite">
      {text.split("").map((char, charIndex) => (
        <span key={charIndex} className={charIndex === index ? "working-letter-on" : undefined}>
          {char}
        </span>
      ))}
    </span>
  );
}

function contextSizeTitle(tokens: number, maxContextTokens: number): string {
  const used = formatTokenCount(tokens);
  if (maxContextTokens > 0) {
    return `Context on this machine: ${used} of ${formatTokenCount(maxContextTokens)}`;
  }
  return `Context on this machine: ${used}`;
}
