/** Setup progress as a semantic ordered list. */
export function Stepper({ steps, current }: {
  steps: { id: string; label: string }[];
  current: number;
}) {
  return (
    <ol className="stepper" aria-label="Setup progress">
      {steps.map((s, i) => (
        <li
          key={s.id}
          aria-current={i === current ? "step" : undefined}
          data-state={i < current ? "done" : i === current ? "active" : "todo"}
        >
          <span className="dot" aria-hidden="true">
            {i < current ? "✓" : i + 1}
          </span>
          <span>{s.label}</span>
        </li>
      ))}
    </ol>
  );
}
