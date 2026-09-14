import { useEffect, useRef, useState } from "react";
import { layoutMessage } from "@domain/message";
import { displayFolder, threadTitle } from "@domain/thread";
import type { ChatBlock, ProjectedMessage, Thread } from "@shared/types";
import { ComposeIcon, TerminalIcon } from "./icons";
import { MarkdownBody } from "./MarkdownBody";
import { Thought } from "./Thought";
import { ToolCall } from "./ToolCall";
import { ToolGroup } from "./ToolGroup";

type Props = {
  machineName: string | null;
  homeDir: string | null;
  thread: Thread | null;
  composing: boolean;
  draftCwd: string | null;
  messages: ProjectedMessage[];
  liveDelta: string;
  liveThought: string;
  error: string | null;
  onNewThread: () => void;
  onOpenTerminal: () => void;
  previewOpen: boolean;
  onTogglePreview: () => void;
  terminalOpen: boolean;
  onClearError: () => void;
};

const BOTTOM_PX = 48;

function nearBottom(node: HTMLElement): boolean {
  const leftover = node.scrollHeight - node.scrollTop - node.clientHeight;
  return leftover <= BOTTOM_PX;
}

export function ChatPane(props: Props) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const pinnedRef = useRef(true);
  const [showJump, setShowJump] = useState(false);

  const applyPin = (pinned: boolean) => {
    pinnedRef.current = pinned;
    setShowJump(!pinned);
  };

  const scrollToLatest = () => {
    const node = listRef.current;
    if (!node) {
      return;
    }
    node.scrollTop = node.scrollHeight;
    applyPin(true);
  };

  useEffect(() => {
    applyPin(true);
  }, [props.thread?.id]);

  useEffect(() => {
    const node = listRef.current;
    if (!node) {
      return;
    }
    if (!pinnedRef.current) {
      return;
    }
    node.scrollTop = node.scrollHeight;
  }, [props.messages, props.liveDelta, props.liveThought]);

  const title = props.thread ? threadTitle(props.thread) : props.composing ? "New thread" : "Diodati";
  const cwd = props.thread?.cwd ?? props.draftCwd;
  const subtitle = props.machineName
    ? `${props.machineName} · ${displayFolder(cwd, props.homeDir)}`
    : "Select a machine";

  return (
    <section className="chat-main">
      <header className="chat-header">
        <div>
          <h2 title={title}>{title}</h2>
          <p>{subtitle}</p>
        </div>
        <div className="header-actions">
          <button
            className={props.terminalOpen ? "icon-btn active" : "icon-btn"}
            title={props.terminalOpen ? "hide terminal" : "show terminal"}
            onClick={props.onOpenTerminal}
            disabled={!props.machineName}
          >
            <TerminalIcon />
          </button>
          <button
            className="icon-btn"
            title="new thread"
            onClick={props.onNewThread}
            disabled={!props.machineName}
          >
            <ComposeIcon />
          </button>
          {props.previewOpen ? null : (
            <button className="ghost" onClick={props.onTogglePreview} disabled={!props.machineName}>
              show site
            </button>
          )}
        </div>
      </header>
      {props.error ? (
        <div className="status-error" title={props.error}>
          <span>{props.error.split("\n")[0]}</span>
          <button className="icon-btn" title="dismiss" onClick={props.onClearError}>
            ×
          </button>
        </div>
      ) : null}
      {!props.thread && !props.composing ? (
        <div className="empty">
          {props.machineName
            ? `Open a thread on ${props.machineName}, or start a new one.`
            : "Select a machine, then open a thread or start a new one beside the machine name."}
        </div>
      ) : (
        <div className="messages-wrap">
          <div
            className="messages"
            ref={listRef}
            onScroll={() => {
              const node = listRef.current;
              if (!node) {
                return;
              }
              applyPin(nearBottom(node));
            }}
          >
          {props.messages.map((message) => {
            const parts = layoutMessage(message.blocks);
            let proseSeen = false;
            return parts.map((part, index) => {
              if (part.kind === "thinking") {
                return (
                  <div key={`${message.id}-thought-${index}`} className="thought-strip">
                    <Thought text={part.text} />
                  </div>
                );
              }
              if (part.kind === "notice") {
                return (
                  <div key={`${message.id}-notice-${index}`} className="notice">
                    {part.text}
                  </div>
                );
              }
              if (part.kind === "tools") {
                return (
                  <div key={`${message.id}-tools-${index}`} className="tool-strip">
                    {part.tools.length === 1 ? (
                      <ToolCall
                        name={part.tools[0].name}
                        inputText={part.tools[0].inputText}
                        outputText={part.tools[0].outputText}
                        running={part.tools[0].running}
                        errored={part.tools[0].errored}
                      />
                    ) : (
                      <ToolGroup tools={part.tools} />
                    )}
                  </div>
                );
              }
              const showMeta = !proseSeen;
              proseSeen = true;
              return (
                <article
                  key={`${message.id}-prose-${index}`}
                  className={message.role === "user" ? "bubble user" : "bubble"}
                >
                  {showMeta ? <div className="meta">{message.role}</div> : null}
                  {part.blocks.map((block, blockIndex) => renderLoneBlock(block, blockIndex))}
                </article>
              );
            });
          })}
          {props.liveThought ? (
            <div className="thought-strip">
              <Thought text={props.liveThought} startOpen />
            </div>
          ) : null}
          {props.liveDelta ? (
            <article className="bubble">
              <div className="meta">agent</div>
              <MarkdownBody text={props.liveDelta} />
            </article>
          ) : null}
          </div>
          {showJump ? (
            <button className="jump-latest" title="return to bottom" onClick={scrollToLatest}>
              latest
            </button>
          ) : null}
        </div>
      )}
    </section>
  );
}

function renderLoneBlock(block: ChatBlock, index: number) {
  if (block.kind === "text") {
    return <MarkdownBody key={index} text={block.text} />;
  }
  if (block.kind === "thinking") {
    throw new Error("thinking block reached prose layout");
  }
  if (block.kind === "tool") {
    return (
      <ToolCall
        key={index}
        name={block.name}
        inputText={block.inputText}
        outputText={block.outputText}
        running={block.running}
        errored={block.errored}
      />
    );
  }
  if (block.kind === "error") {
    return (
      <div key={index} className="msg-error">
        {block.text}
      </div>
    );
  }
  return (
    <div key={index} className="notice">
      {block.text}
    </div>
  );
}
