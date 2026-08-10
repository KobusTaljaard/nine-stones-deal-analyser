import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { R, defaultInputs, computeDeal, methodLabel } from "../lib/calc.js";
import { Btn, Banner } from "./ui.jsx";

function timeAgo(iso) {
  const d = new Date(iso);
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString("en-ZA");
}

function KanbanCard({ deal, onOpen }) {
  const inp = { ...defaultInputs(), ...(deal.inputs || {}) };
  const c = computeDeal(inp);
  const mao = inp.preferredMethod === "isa" ? (c.isaViable ? c.isaMao : null) : c.cash;
  return (
    <div className={`ns-kcard ${inp.approved ? "approved" : "fresh"}`} onClick={() => onOpen(deal.id)}>
      <div>
        <div className="ns-kcard-client">{deal.client_name || "Unnamed lead"}</div>
        <div className="ns-kcard-addr">{deal.property_address || "No address captured yet"}</div>
      </div>
      <div className="ns-kcard-foot">
        <div>
          <div className="ns-kcard-method">{methodLabel(inp.preferredMethod)} · MAO</div>
          <div className="ns-kcard-mao">{mao === null ? "Not viable" : R(mao)}</div>
        </div>
        <div className="ns-kcard-time">{timeAgo(deal.updated_at)}</div>
      </div>
    </div>
  );
}

function Lane({ title, count, colour, children }) {
  return (
    <div className="ns-lane">
      <div className="ns-lane-head">
        <span className="ns-dot" style={{ background: colour, width: 10, height: 10 }} />
        <span className="ns-lane-title">{title}</span>
        <span className="ns-lane-count">{count}</span>
        <span className="ns-lane-rule" />
      </div>
      {children}
    </div>
  );
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
    if (err) { setError(err.message); setDeals([]); return; }
    setDeals(data || []);
  }

  useEffect(() => { load(); }, []);

  async function createDeal() {
    setCreating(true);
    const { data, error: err } = await supabase
      .from("deals")
      .insert({ client_name: "", property_address: "", inputs: defaultInputs() })
      .select("id").single();
    setCreating(false);
    if (err) { setError(err.message); return; }
    onOpen(data.id);
  }

  const filtered = (deals || []).filter((d) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (d.client_name || "").toLowerCase().includes(q)
      || (d.property_address || "").toLowerCase().includes(q);
  });

  const fresh = filtered.filter((d) => !(d.inputs || {}).approved);
  const done = filtered.filter((d) => (d.inputs || {}).approved);

  return (
    <div className="ns-shell">
      <div className="ns-topbar">
        <div className="ns-wrap ns-topbar-inner">
          <div className="ns-brand">
            <div className="ns-brand-mark">NS</div>
            <div>
              <div className="ns-brand-name">Nine Stones Capital</div>
              <div className="ns-brand-sub">Deal Analyser</div>
            </div>
          </div>
          <Btn kind="gold" onClick={createDeal} disabled={creating}>
            {creating ? "Creating…" : "+ New Deal"}
          </Btn>
        </div>
      </div>

      <div className="ns-body">
        <div className="ns-wrap">
          <input className="ns-search" type="text" placeholder="Search by client or address…"
            value={query} onChange={(e) => setQuery(e.target.value)} />

          {error && <Banner tone="neg">Couldn't reach the database: {error}. Check your connection and reload.</Banner>}

          {deals === null && !error && <div className="ns-empty">Loading deals…</div>}

          {deals !== null && filtered.length === 0 && !error && (
            <div className="ns-empty">
              {deals.length === 0 ? "No deals yet. Click “+ New Deal” to analyse your first property." : "No deals match your search."}
            </div>
          )}

          {fresh.length > 0 && (
            <Lane title="New leads — numbers not checked yet" count={fresh.length} colour="var(--fresh)">
              <div className="ns-grid">
                {fresh.map((d) => <KanbanCard key={d.id} deal={d} onOpen={onOpen} />)}
              </div>
            </Lane>
          )}

          {done.length > 0 && (
            <Lane title="Analysed & approved" count={done.length} colour="var(--pos)">
              <div className="ns-grid">
                {done.map((d) => <KanbanCard key={d.id} deal={d} onOpen={onOpen} />)}
              </div>
            </Lane>
          )}
        </div>
      </div>
    </div>
  );
}
