/* Architectural visual echoing the reference: dark concrete cantilever
   building with slatted balcony rail, pale sky, misty grass slope.
   Pure SVG, no assets. */

export function ArchVisual() {
  return (
    <svg
      viewBox="0 0 400 560"
      preserveAspectRatio="xMidYMid slice"
      width="100%"
      height="100%"
      role="img"
      aria-label="Modern dark concrete building"
      style={{ display: "block" }}
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#dfe3e6" />
          <stop offset="0.62" stopColor="#c3c9cc" />
          <stop offset="1" stopColor="#a9b2b2" />
        </linearGradient>
        <linearGradient id="concrete" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#2b2b2c" />
          <stop offset="0.55" stopColor="#1b1b1c" />
          <stop offset="1" stopColor="#0e0e0f" />
        </linearGradient>
        <linearGradient id="grass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7d9b52" />
          <stop offset="0.5" stopColor="#5c7a3c" />
          <stop offset="1" stopColor="#3c5228" />
        </linearGradient>
        <linearGradient id="mist" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#dfe3e6" stopOpacity="0" />
          <stop offset="1" stopColor="#dfe3e6" stopOpacity="0.55" />
        </linearGradient>
      </defs>

      {/* sky */}
      <rect width="400" height="560" fill="url(#sky)" />
      {/* distant mist band */}
      <rect y="330" width="400" height="120" fill="url(#mist)" />

      {/* main cantilevered volume */}
      <polygon points="120,-20 430,-20 430,210 60,330" fill="#101012" />
      {/* concrete pier */}
      <polygon points="150,300 235,282 235,560 150,560" fill="url(#concrete)" />
      {/* undercroft shadow */}
      <polygon points="60,330 150,300 150,560 60,560" fill="#0a0a0b" opacity="0.85" />

      {/* balcony slab */}
      <polygon points="40,340 430,180 430,196 40,356" fill="#1f1f21" />
      {/* slatted railing */}
      {Array.from({ length: 46 }, (_, i) => {
        const t = i / 45;
        const x1 = 48 + t * 372;
        const yTop = 336 - t * 152;
        return <line key={i} x1={x1} y1={yTop} x2={x1} y2={yTop + 44} stroke="#3a3a3e" strokeWidth="2" />;
      })}
      <line x1="40" y1="342" x2="430" y2="182" stroke="#2c2c2e" strokeWidth="3" />

      {/* side fin wall */}
      <polygon points="40,340 78,330 78,470 40,482" fill="#141416" />
      {Array.from({ length: 9 }, (_, i) => (
        <line key={i} x1={46 + i * 3.4} y1={340 - i * 1.1} x2={46 + i * 3.4} y2={476 - i * 1.3} stroke="#333" strokeWidth="1.6" />
      ))}

      {/* grass slope */}
      <path d="M0,470 Q120,430 210,455 T400,430 L400,560 L0,560 Z" fill="url(#grass)" />
      <path d="M0,500 Q140,470 260,492 T400,478 L400,560 L0,560 Z" fill="#335020" opacity="0.7" />
      {/* grass blade hints */}
      {Array.from({ length: 26 }, (_, i) => {
        const x = 8 + ((i * 67) % 390);
        const yb = 500 + ((i * 41) % 50);
        return (
          <line key={i} x1={x} y1={yb} x2={x + 3} y2={yb - 12 - ((i * 13) % 10)}
            stroke="#203515" strokeWidth="1.4" opacity="0.8" />
        );
      })}
      {/* low mist over grass */}
      <rect y="430" width="400" height="70" fill="url(#mist)" opacity="0.7" />
    </svg>
  );
}
