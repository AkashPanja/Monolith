import { useRef, useState, type ReactNode } from "react";

/** Press-and-hold confirm. Pointer + keyboard (Space/Enter) support,
 *  releases cancel. Progress is visual only; completion fires onComplete. */
export function HoldButton({ ms = 1000, onComplete, children }: {
  ms?: number;
  onComplete: () => void;
  children: ReactNode;
}) {
  const [p, setP] = useState(0);
  const raf = useRef(0);
  const t0 = useRef(0);
  const done = useRef(false);

  const tick = (t: number) => {
    const v = Math.min((t - t0.current) / ms, 1);
    setP(v);
    if (v >= 1 && !done.current) {
      done.current = true;
      onComplete();
      return;
    }
    raf.current = requestAnimationFrame(tick);
  };
  const start = () => {
    done.current = false;
    t0.current = performance.now();
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(tick);
  };
  const stop = () => {
    cancelAnimationFrame(raf.current);
    setP(0);
  };

  return (
    <button
      type="button"
      className="hold"
      style={{ ["--p" as string]: p }}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onKeyDown={(e) => {
        if ((e.key === " " || e.key === "Enter") && !e.repeat) start();
      }}
      onKeyUp={(e) => {
        if (e.key === " " || e.key === "Enter") stop();
      }}
      onBlur={stop}
    >
      <span className="hold-fill" aria-hidden="true" />
      {children}
    </button>
  );
}

function PowerIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M12 3v9M6.3 6.3a8 8 0 1 0 11.4 0" />
    </svg>
  );
}

/** Kill switch: red-outline button opening a <dialog> (free focus trap +
 *  Esc). Consequences list only what the /api/kill handler performs. */
export function KillSwitch({ onConfirm, consequences, disabled }: {
  onConfirm: () => void;
  consequences: string[];
  disabled?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button className="btn-kill" disabled={disabled} onClick={() => ref.current?.showModal()}>
        <PowerIcon /> Kill
      </button>
      <dialog ref={ref} className="kill-dialog" aria-labelledby="kill-title">
        <h2 id="kill-title">Activate kill switch?</h2>
        <ul>
          {consequences.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        <div className="row">
          <button autoFocus className="cancel" onClick={() => ref.current?.close()}>
            Cancel
          </button>
          <HoldButton
            onComplete={() => {
              ref.current?.close();
              onConfirm();
            }}
          >
            Hold to confirm (1s)
          </HoldButton>
        </div>
      </dialog>
    </>
  );
}
