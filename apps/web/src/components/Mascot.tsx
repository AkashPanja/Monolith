import { useEffect, useRef } from "react";

export type MascotMood = "idle" | "happy" | "shy" | "error";

/**
 * Atlas bot mascot. Pupils track the cursor via rAF (pointer-events: none),
 * blinks on an idle timer, and reacts to form state via `mood`:
 * happy = bounce on valid input, shy = covers eyes on password focus, error = shake.
 */
export function Mascot({ mood = "idle" }: { mood?: MascotMood }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const moodRef = useRef(mood);
  moodRef.current = mood;

  useEffect(() => {
    let raf = 0;
    let blinkAt = performance.now() + 2800;
    let blinking = false;
    const pupils = () => [
      svgRef.current?.querySelector<SVGGElement>("#pupil-l"),
      svgRef.current?.querySelector<SVGGElement>("#pupil-r"),
    ];
    const lids = () => svgRef.current?.querySelector<SVGRectElement>("#lids");

    const onMove = (e: PointerEvent) => {
      const el = svgRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height * 0.42;
      const dx = Math.max(-1, Math.min(1, (e.clientX - cx) / (r.width * 1.2)));
      const dy = Math.max(-1, Math.min(1, (e.clientY - cy) / (r.height * 1.2)));
      const shy = moodRef.current === "shy";
      for (const p of pupils()) {
        if (!p) continue;
        const px = shy ? 0 : dx * 3.4;
        const py = shy ? 2.5 : dy * 2.6;
        p.setAttribute("transform", `translate(${px.toFixed(2)} ${py.toFixed(2)})`);
      }
    };

    const tick = (now: number) => {
      const lid = lids();
      if (lid) {
        if (!blinking && now >= blinkAt) {
          blinking = true;
          lid.setAttribute("height", "26");
          lid.setAttribute("y", "58");
        } else if (blinking && now >= blinkAt + 130) {
          blinking = false;
          blinkAt = now + 2400 + Math.random() * 2600;
          lid.setAttribute("height", "0");
        }
      }
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 200 190"
      width="100%"
      height="auto"
      role="img"
      aria-label="Atlas bot mascot"
      style={{ pointerEvents: "none", overflow: "visible" }}
      className={mood === "error" ? "shake" : undefined}
    >
      <style>
        {`.bob { animation: bob 3.2s ease-in-out infinite; transform-origin: 100px 150px; }
          .happy-bounce { animation: happy 0.6s cubic-bezier(.22,1,.36,1); transform-origin: 100px 150px; }
          @keyframes bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
          @keyframes happy { 0% { transform: translateY(0) scale(1); } 40% { transform: translateY(-12px) scale(1.04); } 100% { transform: translateY(0) scale(1); } }
          @media (prefers-reduced-motion: reduce) { .bob, .happy-bounce { animation: none; } }`}
      </style>
      <g className={`bob ${mood === "happy" ? "happy-bounce" : ""}`}>
        {/* body */}
        <rect x="52" y="46" width="96" height="92" rx="30" fill="#2563eb" />
        <rect x="52" y="46" width="96" height="92" rx="30" fill="url(#sheen)" />
        {/* antenna */}
        <line x1="100" y1="46" x2="100" y2="26" stroke="#1e40af" strokeWidth="5" strokeLinecap="round" />
        <circle cx="100" cy="22" r="7" fill="#22c55e">
          <animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite" />
        </circle>
        {/* ears */}
        <rect x="40" y="80" width="12" height="30" rx="6" fill="#1e40af" />
        <rect x="148" y="80" width="12" height="30" rx="6" fill="#1e40af" />
        {/* face screen */}
        <rect x="64" y="62" width="72" height="56" rx="16" fill="#0b1530" />
        {/* eyes */}
        <g id="pupil-l">
          <circle cx="86" cy="86" r="9" fill="#fff" />
          <circle cx="86" cy="86" r="4.4" fill="#38bdf8" />
        </g>
        <g id="pupil-r">
          <circle cx="114" cy="86" r="9" fill="#fff" />
          <circle cx="114" cy="86" r="4.4" fill="#38bdf8" />
        </g>
        <rect id="lids" x="64" y="62" width="72" height="0" fill="#0b1530" />
        {/* smile / shy mouth */}
        {mood === "shy" ? (
          <ellipse cx="100" cy="106" rx="5" ry="6.5" fill="#7dd3fc" />
        ) : (
          <path d="M88 104 Q100 112 112 104" stroke="#7dd3fc" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        )}
        {/* shy arms cover eyes */}
        {mood === "shy" && (
          <g fill="#1e40af">
            <ellipse cx="72" cy="88" rx="13" ry="17" />
            <ellipse cx="128" cy="88" rx="13" ry="17" />
          </g>
        )}
        {/* belly panel */}
        <rect x="82" y="122" width="36" height="8" rx="4" fill="#93c5fd" opacity="0.85" />
        <defs>
          <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0.28" />
            <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>
      </g>
    </svg>
  );
}
