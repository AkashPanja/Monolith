/** Accessible tab bar. Tabs are buttons with aria-selected; locked tabs
 *  carry a lock marker and optional hint. */
export interface TabDef {
  id: string;
  label: string;
  count?: number;
  locked?: boolean;
  hint?: string;
}

export function Tabs({ tabs, value, onChange, label }: {
  tabs: TabDef[];
  value: string;
  onChange: (id: string) => void;
  label: string;
}) {
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={t.id === value}
          className="tab"
          title={t.hint}
          onClick={() => onChange(t.id)}
        >
          {t.locked && (
            <span className="lock" aria-hidden="true">🔒</span>
          )}
          {t.label}
          {t.count !== undefined && t.count > 0 && (
            <span className="tab-badge">{t.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}
