import { useRef } from "react";

type Props = {
  axis: "x" | "y";
  invert?: boolean;
  end?: boolean;
  onDragStart: () => number;
  onDrag: (size: number) => void;
  onDragEnd?: () => void;
};

export function Splitter(props: Props) {
  const dragRef = useRef<{ origin: number; size: number } | null>(null);

  return (
    <div
      className={`${props.axis === "x" ? "splitter x" : "splitter y"}${props.end ? " end" : ""}`}
      onPointerDown={(event) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        const origin = props.axis === "x" ? event.clientX : event.clientY;
        dragRef.current = { origin, size: props.onDragStart() };
      }}
      onPointerMove={(event) => {
        const drag = dragRef.current;
        if (!drag) {
          return;
        }
        const now = props.axis === "x" ? event.clientX : event.clientY;
        const raw = now - drag.origin;
        const delta = props.invert ? -raw : raw;
        props.onDrag(drag.size + delta);
      }}
      onPointerUp={() => {
        dragRef.current = null;
        props.onDragEnd?.();
      }}
    />
  );
}
