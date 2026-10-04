import { useId } from "react";

function EyeIcon({ off }: { off?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="M4 4l16 16" />}
    </svg>
  );
}

/** Password input with a real eye/eye-off toggle. Empty placeholder
 *  (dots that look pre-filled are banned). Errors surface via role=alert. */
export function PasswordField(p: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  reveal: boolean;
  onToggleReveal: () => void;
  autoComplete: string;
  error?: string;
  describedBy?: string;
  onBlur?: () => void;
}) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{p.label}</label>
      <div className="field-wrap">
        <input
          id={id}
          type={p.reveal ? "text" : "password"}
          value={p.value}
          onChange={(e) => p.onChange(e.target.value)}
          onBlur={p.onBlur}
          autoComplete={p.autoComplete}
          aria-invalid={!!p.error}
          aria-describedby={p.describedBy}
          placeholder=""
          style={p.reveal ? undefined : { paddingRight: 44 }}
        />
        <button
          type="button"
          className="eye-btn"
          onClick={p.onToggleReveal}
          aria-pressed={p.reveal}
          aria-label={p.reveal ? "Hide passwords" : "Show passwords"}
        >
          <EyeIcon off={p.reveal} />
        </button>
      </div>
      {p.error && (
        <p role="alert" className="field-error">
          {p.error}
        </p>
      )}
    </div>
  );
}

export const PASSWORD_RULES = [
  { id: "len", label: "At least 8 characters", test: (v: string) => v.length >= 8 },
  { id: "num", label: "A number", test: (v: string) => /\d/.test(v) },
  { id: "sym", label: "A special character", test: (v: string) => /[^A-Za-z0-9]/.test(v) },
];

/** Live rule checklist (polite live region — announces without stealing focus). */
export function PasswordRules({ value, rules = PASSWORD_RULES }: {
  value: string;
  rules?: typeof PASSWORD_RULES;
}) {
  return (
    <ul id="pw-rules" className="rules" aria-live="polite">
      {rules.map((r) => {
        const ok = r.test(value);
        return (
          <li key={r.id} data-ok={ok}>
            <span aria-hidden="true">{ok ? "✓" : "○"}</span> {r.label}
          </li>
        );
      })}
    </ul>
  );
}
