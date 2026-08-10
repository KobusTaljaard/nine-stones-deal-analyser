// ═══════════════════════════════════════════════════════════════
// Shared UI primitives — Nine Stones Capital
// Styling lives in index.css so the grid can be truly responsive.
// ═══════════════════════════════════════════════════════════════

export function Grid({ children, cols = 3 }) {
  return <div className={cols === 2 ? "ns-grid-2" : "ns-grid"}>{children}</div>;
}

export function Card({ n, title, accent, wide, full, children }) {
  const cls = ["ns-card", accent ? `accent-${accent}` : "", wide ? "ns-span-2" : "", full ? "ns-span-all" : ""]
    .filter(Boolean).join(" ");
  return (
    <div className={cls}>
      {(n || title) && (
        <div className="ns-card-head">
          {n && <div className="ns-num">{n}</div>}
          {title && <div className="ns-card-title">{title}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

export function Note({ children }) {
  return <div className="ns-card-note">{children}</div>;
}

export function Row({ l, v, sub, tone, strong, big }) {
  return (
    <div className="ns-row">
      <div>
        <div className={`ns-row-l${strong ? " strong" : ""}`}>{l}</div>
        {sub && <div className="ns-row-sub">{sub}</div>}
      </div>
      <div className={`ns-row-v${big ? " big" : ""}${tone ? ` ${tone}` : ""}`}>{v}</div>
    </div>
  );
}

export function Hero({ label, value, sub, tone }) {
  return (
    <div className="ns-hero">
      <div className="ns-hero-label">{label}</div>
      <div className={`ns-hero-value${tone ? ` ${tone}` : ""}`}>{value}</div>
      {sub && <div className="ns-hero-sub">{sub}</div>}
    </div>
  );
}

export function StickyMao({ label, value, sub, side }) {
  return (
    <div className="ns-sticky">
      <div className="ns-sticky-inner">
        <div>
          <div className="ns-sticky-label">{label}</div>
          <div className="ns-sticky-value">{value}</div>
          {sub && <div className="ns-sticky-sub">{sub}</div>}
        </div>
        {side && (
          <div className="ns-sticky-side">
            <div className="ns-sticky-side-label">{side.label}</div>
            <div className="ns-sticky-side-value" style={{ color: side.color || "#fff" }}>{side.value}</div>
          </div>
        )}
      </div>
    </div>
  );
}

export function Label({ children }) {
  return <span className="ns-label">{children}</span>;
}

export function NumInput({ label, value, onChange, step = 10000, prefix = "R", min, max }) {
  return (
    <div className="ns-field">
      <Label>{label}</Label>
      <div className="ns-input-wrap">
        {prefix && <span className="ns-prefix">{prefix}</span>}
        <input
          className="ns-input"
          type="number"
          value={Number.isFinite(value) ? value : 0}
          step={step} min={min} max={max}
          onChange={(e) => {
            const v = e.target.value === "" ? 0 : +e.target.value;
            if (!Number.isFinite(v)) return;
            onChange(v);
          }}
        />
      </div>
    </div>
  );
}

export function TextInput({ label, value, onChange, placeholder = "", type = "text" }) {
  return (
    <div className="ns-field">
      <Label>{label}</Label>
      <div className="ns-input-wrap">
        <input
          className="ns-input text"
          type={type}
          value={value || ""}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}

export function Help({ children }) {
  return <div className="ns-help">{children}</div>;
}

export function Slider({ label, value, onChange, min, max, step = 1, suffix = "%" }) {
  return (
    <div className="ns-field">
      <div className="ns-slider-head">
        <Label>{label}</Label>
        <span className="ns-slider-val">{value}{suffix}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(+e.target.value)} />
      <div className="ns-slider-ends"><span>{min}{suffix}</span><span>{max}{suffix}</span></div>
    </div>
  );
}

export function Toggle({ label, value, onChange }) {
  return (
    <div className="ns-toggle">
      <Label>{label}</Label>
      <button
        type="button"
        role="switch"
        aria-checked={!!value}
        aria-label={label}
        className={`ns-switch${value ? " on" : ""}`}
        onClick={() => onChange(!value)}
      >
        <span className="ns-switch-dot" />
      </button>
    </div>
  );
}

export function SegButtons({ label, value, onChange, options }) {
  return (
    <div className="ns-field">
      {label && <Label>{label}</Label>}
      <div className="ns-seg">
        {options.map((o) => (
          <button key={o.value} type="button"
            className={`ns-seg-btn${value === o.value ? " on" : ""}`}
            onClick={() => onChange(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Banner({ tone = "warn", children }) {
  return <div className={`ns-banner ${tone}`}>{children}</div>;
}

export function Pill({ tone = "sage", children }) {
  return <span className={`ns-pill ${tone}`}><span className="ns-dot" />{children}</span>;
}

export function Btn({ kind = "primary", onClick, disabled, children, style }) {
  return (
    <button type="button" className={`ns-btn ns-btn-${kind}`} onClick={onClick} disabled={disabled} style={style}>
      {children}
    </button>
  );
}

export function Check({ checked, onChange, children }) {
  return (
    <label className="ns-check">
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{children}</span>
    </label>
  );
}

export function Modal({ title, body, confirmLabel, confirmKind = "danger-solid", onConfirm, onCancel, confirmDisabled }) {
  return (
    <div className="ns-modal-back" onClick={onCancel}>
      <div className="ns-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ns-modal-title">{title}</div>
        <div className="ns-modal-body">{body}</div>
        <div className="ns-modal-actions">
          <Btn kind="ghost" onClick={onCancel}>Cancel</Btn>
          <Btn kind={confirmKind} onClick={onConfirm} disabled={confirmDisabled}>{confirmLabel}</Btn>
        </div>
      </div>
    </div>
  );
}

export function RiskBadge({ level }) {
  const cfg = {
    low: { label: "Low risk — up to 90% MAO", tone: "pos" },
    medium: { label: "Medium risk — use 80% MAO", tone: "warn" },
    high: { label: "High risk — max 70% MAO", tone: "neg" },
  }[level] || { label: "Medium risk", tone: "warn" };
  return <Pill tone={cfg.tone}>{cfg.label}</Pill>;
}
