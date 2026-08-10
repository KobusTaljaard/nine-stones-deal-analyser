import { C } from "../lib/calc.js";

export function Label({ children }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1.2px", textTransform: "uppercase", color: C.sub, marginBottom: 5 }}>
      {children}
    </div>
  );
}

export function NumInput({ label, value, onChange, step = 10000, prefix = "R", min, max }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <Label>{label}</Label>
      <div style={{ display: "flex", alignItems: "center", background: "#141C2E", border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 13px" }}>
        {prefix && <span style={{ color: C.sub, marginRight: 6, fontSize: 14, userSelect: "none" }}>{prefix}</span>}
        <input
          type="number"
          value={Number.isFinite(value) ? value : 0}
          step={step}
          min={min}
          max={max}
          onChange={(e) => {
            const v = e.target.value === "" ? 0 : +e.target.value;
            if (!Number.isFinite(v)) return;
            onChange(v);
          }}
          style={{ background: "none", border: "none", outline: "none", color: C.text, fontSize: 16, fontWeight: 600, width: "100%", fontFamily: "inherit", fontVariantNumeric: "tabular-nums" }}
        />
      </div>
    </div>
  );
}

export function TextInput({ label, value, onChange, placeholder = "" }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <Label>{label}</Label>
      <div style={{ display: "flex", alignItems: "center", background: "#141C2E", border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 13px" }}>
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          style={{ background: "none", border: "none", outline: "none", color: C.text, fontSize: 14, fontWeight: 500, width: "100%", fontFamily: "inherit" }}
        />
      </div>
    </div>
  );
}

export function Slider({ label, value, onChange, min, max, step = 1, suffix = "%" }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
        <Label>{label}</Label>
        <span style={{ fontSize: 13, fontWeight: 800, color: C.blueL, fontVariantNumeric: "tabular-nums" }}>{value}{suffix}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(+e.target.value)}
        style={{ width: "100%", accentColor: C.blue, cursor: "pointer" }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.sub, marginTop: 2 }}>
        <span>{min}{suffix}</span><span>{max}{suffix}</span>
      </div>
    </div>
  );
}

export function Row({ l, v, sub, color, bold, sep = true }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: sep ? `1px solid ${C.border}` : "none" }}>
      <div>
        <div style={{ fontSize: 13, color: bold ? C.text : C.dim, fontWeight: bold ? 600 : 400 }}>{l}</div>
        {sub && <div style={{ fontSize: 11, color: C.sub, marginTop: 2 }}>{sub}</div>}
      </div>
      <div style={{ fontSize: bold ? 15 : 13, fontWeight: bold ? 700 : 500, color: color || C.text, fontVariantNumeric: "tabular-nums", textAlign: "right" }}>{v}</div>
    </div>
  );
}

export function Card({ children, accent }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${accent || C.border}`, borderRadius: 12, padding: 18, marginBottom: 14 }}>
      {children}
    </div>
  );
}

export function Sec({ children }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: C.blueL, marginBottom: 14, paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>
      {children}
    </div>
  );
}

export function BigOffer({ label, value, color, sub }) {
  return (
    <div style={{ background: C.bg, border: `2px solid ${color || C.border}`, borderRadius: 12, padding: 18, marginTop: 12 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: C.sub, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 900, color: color || C.text, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.5px" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: C.sub, marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

export function Toggle({ label, value, onChange }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
      <Label>{label}</Label>
      <div
        onClick={() => onChange(!value)}
        role="switch"
        aria-checked={value}
        style={{ width: 42, height: 23, borderRadius: 12, background: value ? C.blue : C.border, position: "relative", cursor: "pointer", transition: "background .2s", flexShrink: 0 }}
      >
        <div style={{ position: "absolute", top: 3, left: value ? 21 : 3, width: 17, height: 17, borderRadius: "50%", background: "#fff", transition: "left .2s" }} />
      </div>
    </div>
  );
}

export function SegButtons({ label, value, onChange, options }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <Label>{label}</Label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {options.map((o) => (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            style={{
              padding: "7px 11px",
              borderRadius: 7,
              border: `1px solid ${value === o.value ? C.blue : C.border}`,
              background: value === o.value ? "rgba(37,99,235,0.15)" : "#141C2E",
              color: value === o.value ? C.blueL : C.dim,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ExitRow({ icon, label, value, color, note }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: C.bg, borderRadius: 8, marginBottom: 6 }}>
      <div>
        <div style={{ fontSize: 13, color: C.dim }}>{icon} {label}</div>
        <div style={{ fontSize: 11, color: C.sub }}>{note}</div>
      </div>
      <div style={{ fontSize: 15, fontWeight: 800, color, fontVariantNumeric: "tabular-nums" }}>{value}</div>
    </div>
  );
}

export function InfoRow({ label, value, sub, color }) {
  return (
    <div style={{ padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ fontSize: 12, color: C.dim }}>{label}</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: color || C.text, fontVariantNumeric: "tabular-nums", textAlign: "right", maxWidth: "55%" }}>{value || "—"}</div>
      </div>
      {sub && <div style={{ fontSize: 11, color: C.sub, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export function RiskBadge({ level }) {
  const config = {
    low: { label: "LOW RISK — up to 90% MAO", color: C.green },
    medium: { label: "MEDIUM RISK — use 80% MAO", color: C.amber },
    high: { label: "HIGH RISK — max 70% MAO", color: C.red },
  };
  const { label, color } = config[level] || config.medium;
  return (
    <div style={{ background: C.bg, border: `2px solid ${color}`, borderRadius: 10, padding: "10px 14px", marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0 }} />
      <div style={{ fontSize: 12, fontWeight: 700, color, letterSpacing: "0.5px" }}>{label}</div>
    </div>
  );
}

export function WarningBanner({ children }) {
  return (
    <div style={{ background: "rgba(245,158,11,0.1)", border: `1px solid ${C.amber}`, borderRadius: 10, padding: "12px 14px", marginBottom: 14, fontSize: 12.5, color: C.amber, lineHeight: 1.6, fontWeight: 600 }}>
      {children}
    </div>
  );
}
