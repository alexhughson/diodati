import { useEffect, useRef } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

export function Pop(props: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(props.onClose);
  onCloseRef.current = props.onClose;

  useEffect(() => {
    if (!props.open) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      const root = rootRef.current;
      const target = event.target;
      if (!root || !(target instanceof Node)) {
        return;
      }
      if (root.contains(target)) {
        return;
      }
      onCloseRef.current();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [props.open]);

  return (
    <div className="pop" ref={rootRef}>
      {props.children}
    </div>
  );
}
