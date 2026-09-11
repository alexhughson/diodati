import { useEffect, useRef } from "react";
import { ExternalLinkIcon } from "./icons";
import { Splitter } from "./Splitter";

type Props = {
  url: string;
  visible: boolean;
  suspendEmbed: boolean;
  onToggle: () => void;
  loggedIn: boolean;
  onLogin: () => void;
  onOpenExternal: () => void;
  onResizeStart: () => number;
  onResize: (width: number) => void;
  onResizeEnd: () => void;
};

export function PreviewPane(props: Props) {
  const fillRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = fillRef.current;
    if (!node || !props.visible || props.suspendEmbed) {
      void window.diodati.setPreviewBounds(null);
      return;
    }
    const report = () => {
      const rect = node.getBoundingClientRect();
      void window.diodati.setPreviewBounds({
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      });
    };
    report();
    const observer = new ResizeObserver(report);
    observer.observe(node);
    window.addEventListener("resize", report);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", report);
    };
  }, [props.visible, props.url, props.suspendEmbed]);

  if (!props.visible) {
    return null;
  }

  return (
    <aside className="preview">
      <Splitter
        axis="x"
        invert
        onDragStart={props.onResizeStart}
        onDrag={props.onResize}
        onDragEnd={props.onResizeEnd}
      />
      <div className="preview-bar">
        <input value={props.url} readOnly />
        {props.loggedIn ? null : (
          <button className="ghost" onClick={props.onLogin}>
            log in
          </button>
        )}
        <button className="icon-btn" title="open in web view" onClick={props.onOpenExternal}>
          <ExternalLinkIcon />
        </button>
        <button className="ghost" onClick={props.onToggle}>
          close
        </button>
      </div>
      <div className="preview-fill" ref={fillRef} />
    </aside>
  );
}
