import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { C, R, defaultInputs, computeDeal } from "../lib/calc.js";

function timeAgo(iso) {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString("en-ZA");
}

export default function DealsList({ onOpen }) {
  const [deals, setDeals] = useState(null);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);

  async function load() {
    setError(null);
    const { data, error: err } = await supabase
      .from("deals")
      .select("id, client_name, property_address, inputs, updated_at, status")
      .eq("status", "active")
      .order("updated_at", { ascending: false });
    if (err) {
      setError(err.message);
      setDeals([]);
      return;
    }
    setDeals(data || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function createDeal() {
    setCreating(true);
    const inputs = defaultInputs();
    const { data, error: err } = await supabase
      .from("deals")
      .insert({ client_name: "", property_address: "", inputs })
      .select("id")
      .single();
    setCreating(false);
    if (err) {
      setError(err.message);
      return;
    }
    onOpen(data.id);
  }

  async function archiveDeal(id, e) {
    e.stopPropagation();
    if (!window.confirm("Archive this deal? You can restore it from the database if needed.")) return;
    const { error: err } = await supabase.from("deals").update({ status: "archived" }).eq("id", id);
    if (err) {
      setError(err.message);
      return;
    }
    setDeals((prev) => prev.filter((d) => d.id !== id));
  }

  const filtered = (deals || []).filter((d) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (d.client_name || "").toLowerCase().includes(q) || (d.property_address || "").toLowerCase().includes(q);
  });

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 18px 60px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.3px" }}>Nine Stones Capital</div>
            <div style={{ fontSize: 10, color: C.sub, letterSpacing: "1.5px", fontWeight: 700, textTransform: "uppercase", marginTop: 2 }}>Deal Analyser</div>
          </div>
          <button
            onClick={createDeal}
            disabled={creating}
            style={{ background: C.blue, color: "#fff", border: "none", borderRadius: 8, padding: "10px 16px", fontSize: 13, fontWeight: 700, cursor: creating ? "default" : "pointer", opacity: creating ? 0.6 : 1 }}
          >
            {creating ? "Creating…" : "+ New Deal"}
          </button>
        </div>

        <input
          type="text"
          placeholder="Search by client or address…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ width: "100%", background: "#141C2E", border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 13px", color: C.text, fontSize: 14, fontFamily: "inherit", marginBottom: 18, outline: "none" }}
        />

        {error && (
          <div style={{ background: "rgba(239,68,68,0.1)", border: `1px solid ${C.red}`, borderRadius: 10, padding: "12px 14px", marginBottom: 16, fontSize: 12.5, color: C.red }}>
            Couldn't reach the database: {error}. Check your connection and reload.
          </div>
        )}

        {deals === null && !error && (
          <div style={{ color: C.sub, fontSize: 13, padding: "40px 0", textAlign: "center" }}>Loading deals…</div>
        )}

        {deals !== null && filtered.length === 0 && !error && (
          <div style={{ color: C.sub, fontSize: 13, padding: "40px 0", textAlign: "center" }}>
            {deals.length === 0 ? "No deals yet. Click “+ New Deal” to analyse your first property." : "No deals match your search."}
          </div>
        )}

        {filtered.map((d) => {
          const inp = { ...defaultInputs(), ...(d.inputs || {}) };
          const c = computeDeal(inp);
          return (
            <div
              key={d.id}
              onClick={() => onOpen(d.id)}
              style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginBottom: 10, cursor: "pointer" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {d.client_name || "Unnamed client"}
                  </div>
                  <div style={{ fontSize: 12, color: C.sub, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {d.property_address || "No address set"}
                  </div>
                </div>
                <button
                  onClick={(e) => archiveDeal(d.id, e)}
                  title="Archive"
                  style={{ background: "none", border: "none", color: C.sub, fontSize: 16, cursor: "pointer", padding: "0 0 0 8px", lineHeight: 1 }}
                >
                  ✕
                </button>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                <div style={{ fontSize: 11, color: C.sub }}>Updated {timeAgo(d.updated_at)}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.blueL, fontVariantNumeric: "tabular-nums" }}>
                  MAO {R(c.cash)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
