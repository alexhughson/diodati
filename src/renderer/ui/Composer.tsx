import type { Model, ReasoningLevel } from "@shared/types";
import { FolderPicker } from "./FolderPicker";
import { ModelPicker } from "./ModelPicker";

type FolderChoice = {
  cwd: string;
  label: string;
};

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
  return (
    <div className="composer">
      <div className="composer-box">
        <textarea
          value={props.text}
          placeholder="Message Shelley on this machine"
          disabled={props.disabled}
          onChange={(event) => props.onText(event.target.value)}
          onKeyDown={(event) => {
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
