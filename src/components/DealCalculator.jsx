import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";
import {
  C, R, pct, num, scoreTone, flowTone, defaultInputs, computeDeal,
  OCCUPIER_TYPES, PROPERTY_TYPES, ACQUISITION_METHODS, propertyTypeConfig, methodLabel,
} from "../lib/calc.js";
import {
  Grid, Card, Note, Row, Hero, StickyMao, NumInput, TextInput, Help, Slider,
  Toggle, SegButtons, Banner, Pill, Btn, Check, Modal, RiskBadge, Label,
} from "./ui.jsx";
import NegotiationLog from "./NegotiationLog.jsx";
import DocumentGenerator from "./DocumentGenerator.jsx";
import { downloadSummaryPdf } from "../lib/pdf.js";
import { seedDocFromDeal } from "../lib/docFields.js";

function monthsLabel(m) {
  if (m === null || m === undefined || !isFinite(m)) return "—";
  return `Month ${Math.round(m)} · ${(m / 12).toFixed(1)} yrs`;
}

const TABS = ["Inputs", "Due Diligence", "Negotiation", "Cash Offer", "Installment", "Disposition", "Summary", "Documents"];
const DOCS_TAB = 7;

export default function DealCalculator({ dealId, onBack, onDeleted }) {
  const [tab, setTab] = useState(0);
  const [inp, setInp] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [saveState, setSaveState] = useState("idle");
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selfChecked, setSelfChecked] = useState(false);
  const saveTimer = useRef(null);
  const latestInp = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.from("deals").select("*").eq("id", dealId).single();
      if (cancelled) return;
      if (error) { setLoadError(error.message); return; }
      const merged = {
        ...defaultInputs(), ...(data.inputs || {}),
        clientName: data.client_name || "", propAddress: data.property_address || "",
      };
      setInp(merged);
      setSelfChecked(!!merged.approved);
    })();
    return () => { cancelled = true; };
  }, [dealId]);

  useEffect(() => {
    if (!inp) return;
    latestInp.current = inp;
    setSaveState("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const payload = latestInp.current;
      const { error } = await supabase.from("deals").update({
        client_name: payload.clientName,
        property_address: payload.propAddress,
        inputs: payload,
      }).eq("id", dealId);
      setSaveState(error ? "error" : "saved");
    }, 900);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inp, dealId]);

  const set = (key) => (value) => setInp((prev) => ({ ...prev, [key]: value }));
  const c = useMemo(() => (inp ? computeDeal(inp) : null), [inp]);

  // Document payload lives inside the same inputs JSON, so autosave and
  // Hermes both reach it without a schema change.
  const doc = (inp && inp.doc) || {};
  const setDoc = (updater) => setInp((prev) => ({
    ...prev,
    doc: typeof updater === "function" ? updater(prev.doc || {}) : updater,
  }));

  // Seed the OTP fields the first time the Documents tab is opened.
  useEffect(() => {
    if (tab !== DOCS_TAB || !inp || !c) return;
    if (inp.doc && Object.keys(inp.doc).length) return;
    setInp((prev) => ({ ...prev, doc: seedDocFromDeal(prev, c) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, inp, c]);

  // Headless surface for Hermes: window.NSC
  useEffect(() => {
    if (!inp || !c) return;
    window.NSC = window.NSC || {};
    Object.assign(window.NSC, {
      dealId,
      inputs: inp,
      computed: c,
      setInput: (k, v) => setInp((prev) => ({ ...prev, [k]: v })),
      setInputs: (obj) => setInp((prev) => ({ ...prev, ...obj })),
      goToTab: (i) => setTab(i),
      tabs: TABS,
    });
    return () => { if (window.NSC) { delete window.NSC.inputs; delete window.NSC.computed; } };
  }, [inp, c, dealId]);

  async function reallyDelete() {
    setDeleting(true);
    const { error } = await supabase.from("deals").delete().eq("id", dealId);
    setDeleting(false);
    if (error) { setLoadError(error.message); setShowDelete(false); return; }
    onDeleted ? onDeleted() : onBack();
  }

  if (loadError) {
    return (
      <div className="ns-shell" style={{ alignItems: "center", justifyContent: "center" }}>
        <div className="ns-card" style={{ maxWidth: 400, textAlign: "center" }}>
          <div style={{ color: C.neg, fontWeight: 800, marginBottom: 8 }}>Couldn't load this deal</div>
          <div style={{ color: C.muted, fontSize: 13, marginBottom: 16 }}>{loadError}</div>
          <Btn onClick={onBack}>← Back to dashboard</Btn>
        </div>
      </div>
    );
  }
  if (!inp || !c) {
    return <div className="ns-shell" style={{ alignItems: "center", justifyContent: "center", color: C.muted }}>Loading deal…</div>;
  }

  const {
    clientName, propAddress, sellerPhone, sellerEmail, preferredMethod, approved,
    arv, arvPct, repairs, rental, rentalHigh, asking, gutFeel, propertyType,
    vacancy, levies, maint, insuranceMonthly, flipPct,
    minCashflow, takeOverBond, isaMaxPctOfArv,
    instRate, instYrs, areaGrowthPct, targetRefiLtv, refiCostsPct, settlementMonth,
    sfDepositPct, sfYrs, sfSettlementMonth, rtoAsIsOverrideOn, rtoAsIsOverride, rtoTerm,
    strNightly, strOccupancy, bLtv, bRate, bBondYears, bInterestOnly,
    munVal, listedPrice, daysOnMarket,
    bondAmount, bondArrears, bondMonthly, bondRate, bondEndYear,
    ratesMonthly, ratesArrears, leviesArrears, waterMonthly, tenantPaysWater,
    elecPrepaid, elecAvg3mo,
    occupied, occupierType, evictionMonths, evictionLegalCost, evictionHoldingMonthly,
    sellerMotivatedPrice, sellerWalkAwayPrice, sellerPrefersInstallment, negotiationLog,
    summaryNotes,
  } = inp;

  const ptConfig = propertyTypeConfig(propertyType);
  const profitTone = scoreTone(c.cashP, arv);
  const askingRatio = arv > 0 ? asking / arv : 0;
  const gutRatio = arv > 0 ? gutFeel / arv : 0;
  const warnAsking = arv > 0 && askingRatio >= 3;
  const warnGut = arv > 0 && gutRatio >= 3 && Math.abs(gutFeel - asking) > 1;
  const quality = arv > 0 && c.cashP / arv >= 0.12 ? "STRONG" : arv > 0 && c.cashP / arv >= 0.06 ? "MARGINAL" : "WEAK";
  const qualityColor = profitTone === "pos" ? C.pos : profitTone === "warn" ? C.warn : C.neg;

  // Sticky MAO — recalculates live from the same memo the cards use
  const sticky = (() => {
    if (tab === 3) return {
      label: "Max Cash Offer", value: R(c.cash),
      sub: c.gap >= 0 ? `Covers asking — ${R(c.gap)} negotiating room` : `${R(Math.abs(c.gap))} below asking`,
      side: { label: "Profit at MCO", value: R(c.cashP), color: qualityColor },
    };
    if (tab === 4) return {
      label: "Max Offer Amount — Installment Sale",
      value: c.isaViable ? R(c.isaMao) : "Not viable",
      sub: c.isaViable
        ? `${c.isaBinding === "cashflow" ? "Cash flow" : "Value ceiling"} is the binding constraint`
        : "Rent cannot carry your minimum cash flow",
      side: { label: "Cash flow / mo", value: R(c.isaActualCashflow), color: c.isaActualCashflow >= (minCashflow || 0) ? C.pos : C.neg },
    };
    if (tab === DOCS_TAB) {
      const offer = preferredMethod === "isa" ? c.isaMao : c.cash;
      const rounded = offer ? Math.round(offer / 5000) * 5000 : 0;
      return {
        label: `Offer Price On The Contract — ${methodLabel(preferredMethod)}`,
        value: R(rounded),
        sub: `Rounded to the nearest R5 000 from ${R(offer)}`,
        side: { label: approved ? "Approved" : "Not approved", value: approved ? "✓" : "Check numbers first", color: approved ? C.pos : C.warn },
      };
    }
    const isIsa = preferredMethod === "isa";
    return {
      label: `Max Offer — ${methodLabel(preferredMethod)}`,
      value: isIsa ? (c.isaViable ? R(c.isaMao) : "Not viable") : R(c.cash),
      sub: `Preferred acquisition method · set on the Inputs tab`,
      side: isIsa
        ? { label: "Cash flow / mo", value: R(c.isaActualCashflow), color: c.isaActualCashflow >= (minCashflow || 0) ? C.pos : C.neg }
        : { label: "Profit at MCO", value: R(c.cashP), color: qualityColor },
    };
  })();

  return (
    <div className="ns-shell">
      {/* ── Top bar ─────────────────────────────────────────── */}
      <div className="ns-topbar">
        <div className="ns-wrap ns-topbar-inner">
          <div className="ns-brand">
            <button className="ns-btn-back" onClick={onBack} title="Back to dashboard">←</button>
            <div className="ns-brand-mark">NS</div>
            <div style={{ minWidth: 0 }}>
              <div className="ns-brand-name">{clientName || "Unnamed lead"}</div>
              <div className="ns-brand-sub">{propAddress || "No address set"}</div>
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div className={`ns-savechip${saveState === "error" ? " err" : ""}`}>
              {saveState === "saving" && "Saving…"}
              {saveState === "saved" && "Saved"}
              {saveState === "error" && "Save failed"}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end", marginTop: 6 }}>
              <span style={{ fontSize: 10, letterSpacing: 1.2, color: C.taupe, fontWeight: 800 }}>{quality}</span>
              {approved && <span style={{ fontSize: 10, fontWeight: 800, color: C.pos }}>● APPROVED</span>}
            </div>
            <div className="ns-quality-bar" style={{ width: 130 }}>
              <div className="ns-quality-fill" style={{
                width: `${arv > 0 ? Math.max(3, Math.min(100, (c.cashP / arv) * 700)) : 0}%`,
                background: qualityColor,
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────── */}
      <div className="ns-tabs">
        <div className="ns-wrap ns-tabs-inner">
          {TABS.map((t, i) => (
            <button key={t} className={`ns-tab${tab === i ? " active" : ""}`} onClick={() => setTab(i)}>{t}</button>
          ))}
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────── */}
      <div className="ns-body">
        <div className="ns-wrap">
          <StickyMao {...sticky} />

          {/* ═══ INPUTS ═══════════════════════════════════════ */}
          {tab === 0 && <>
            <Grid>
              <Card n="01" title="Seller & Contact" accent="gold">
                <TextInput label="Client / Seller Name" value={clientName} onChange={set("clientName")} placeholder="e.g. J. Smith" />
                <TextInput label="Cellphone" value={sellerPhone} onChange={set("sellerPhone")} placeholder="+27 …" type="tel" />
                <TextInput label="Email" value={sellerEmail} onChange={set("sellerEmail")} placeholder="name@example.com" type="email" />
                {(sellerPhone || sellerEmail) && (
                  <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 2 }}>
                    {sellerPhone && <a className="ns-contact-link" href={`tel:${sellerPhone.replace(/\s/g, "")}`}>Call</a>}
                    {sellerPhone && <a className="ns-contact-link" href={`https://wa.me/${sellerPhone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer">WhatsApp</a>}
                    {sellerEmail && <a className="ns-contact-link" href={`mailto:${sellerEmail}`}>Email</a>}
                  </div>
                )}
              </Card>

              <Card n="02" title="Property">
                <TextInput label="Property Address" value={propAddress} onChange={set("propAddress")} placeholder="e.g. 12 Oak Ave, Pretoria" />
                <SegButtons label="Property type" value={propertyType} onChange={set("propertyType")}
                  options={PROPERTY_TYPES.map((p) => ({ value: p.value, label: p.label }))} />
                <Note>{ptConfig.desc}</Note>
              </Card>

              <Card n="03" title="Acquisition Preference">
                <SegButtons label="Preferred method" value={preferredMethod} onChange={set("preferredMethod")} options={ACQUISITION_METHODS} />
                <Help>Drives the headline MAO shown on the dashboard and at the top of each tab.</Help>
                <Row l="Max cash offer" v={R(c.cash)} tone={preferredMethod === "cash" ? "gold" : "mut"} strong={preferredMethod === "cash"} />
                <Row l="Max installment offer" v={c.isaViable ? R(c.isaMao) : "Not viable"} tone={preferredMethod === "isa" ? "gold" : "mut"} strong={preferredMethod === "isa"} />
              </Card>

              <Card n="04" title="Property Valuation" accent={warnAsking || warnGut ? "warn" : undefined}>
                {warnAsking && <Banner tone="warn">Asking price is {askingRatio.toFixed(1)}× your ARV — check for a data-entry error before using it.</Banner>}
                {warnGut && <Banner tone="warn">Owner's value is {gutRatio.toFixed(1)}× your ARV. Verify against comparable sales.</Banner>}
                <NumInput label="After Repair Value (ARV)" value={arv} onChange={set("arv")} step={25000} min={0} />
                <NumInput label="Owner's / Gut-Feel Value" value={gutFeel} onChange={set("gutFeel")} step={25000} min={0} />
                <NumInput label="Seller Asking Price" value={asking} onChange={set("asking")} step={10000} min={0} />
                <NumInput label="Estimated Repairs" value={repairs} onChange={set("repairs")} step={5000} min={0} />
                <Slider label="ARV % — cash acquisition ceiling" value={arvPct} onChange={set("arvPct")} min={65} max={95} />
              </Card>

              <Card n="05" title="Rental Income">
                <NumInput label="Market Rental / Month" value={rental} onChange={set("rental")} step={500} min={0} />
                <NumInput label="Market Rental — Top of Range" value={rentalHigh} onChange={set("rentalHigh")} step={500} min={0} />
                <Help>Top of the area's range — drives the Rent-to-Own rate (110% of this).</Help>
                <NumInput label="STR Avg Nightly Rate" value={strNightly} onChange={set("strNightly")} step={100} min={0} />
                <Slider label="STR Occupancy" value={strOccupancy} onChange={set("strOccupancy")} min={30} max={95} />
              </Card>

              <Card n="06" title="Operating Costs">
                <Slider label="Vacancy Rate" value={vacancy} onChange={set("vacancy")} min={0} max={25} />
                {ptConfig.hasLevy
                  ? <NumInput label={ptConfig.levyLabel} value={levies} onChange={set("levies")} step={100} min={0} />
                  : <Banner tone="info">No levy — freehold with no HOA or body corporate.</Banner>}
                <NumInput label="Maintenance Reserve / Month" value={maint} onChange={set("maint")} step={100} min={0} />
                <NumInput label="Insurance / Month" value={insuranceMonthly} onChange={set("insuranceMonthly")} step={100} min={0} />
                <Slider label="Flip selling costs (% of ARV)" value={flipPct} onChange={set("flipPct")} min={3} max={15} />
              </Card>
            </Grid>

            <Card full title="Danger Zone" accent="neg">
              <Note>Permanently removes this deal and its analysis from the database. This cannot be undone.</Note>
              <div><Btn kind="danger" onClick={() => setShowDelete(true)}>Delete this deal permanently</Btn></div>
            </Card>
          </>}

          {/* ═══ DUE DILIGENCE ════════════════════════════════ */}
          {tab === 1 && <Grid>
            <Card n="01" title="Risk Assessment" accent={c.riskLevel === "low" ? "pos" : c.riskLevel === "high" ? "neg" : "warn"}>
              <div style={{ marginBottom: 14 }}><RiskBadge level={c.riskLevel} /></div>
              <Row l="Total arrears" v={R(c.totalArrears)} tone={c.totalArrears > 50000 ? "neg" : c.totalArrears > 15000 ? "warn" : "pos"} strong />
              <Row l="Bond vs ARV" v={bondAmount > 0 && arv > 0 ? pct(bondAmount / arv * 100) : "—"}
                tone={bondAmount > arv * 0.75 ? "neg" : bondAmount > arv * 0.55 ? "warn" : "pos"} />
              <Row l="Occupier present" v={occupied ? "Yes" : "No"} tone={occupied ? "neg" : "pos"} />
            </Card>

            <Card n="02" title="Occupancy & Eviction" accent={occupied ? "neg" : undefined}>
              <Toggle label="Occupied by unlawful occupier / non-paying tenant?" value={occupied} onChange={set("occupied")} />
              {occupied && <>
                <SegButtons label="Occupier type" value={occupierType} onChange={set("occupierType")} options={OCCUPIER_TYPES} />
                <Slider label="Estimated PIE Act timeline" value={evictionMonths} onChange={set("evictionMonths")} min={3} max={24} suffix=" mo" />
                <NumInput label="Legal & sheriff costs" value={evictionLegalCost} onChange={set("evictionLegalCost")} step={5000} min={0} />
                <NumInput label="Monthly holding cost during eviction" value={evictionHoldingMonthly} onChange={set("evictionHoldingMonthly")} step={500} min={0} />
                <Help>Leave at R 0 to use total monthly exposure automatically.</Help>
                <Row l="Holding cost used" v={`${R(c.evictHoldMonthly)} / mo`} />
                <Row l="Total eviction exposure" v={R(c.evictionExposure)} tone="neg" strong sub="Deducted from the cash offer only" />
                <Banner tone="warn">The PIE Act requires a court order before removing any occupier. Budget 6–18 months. Self-help eviction is a criminal offence.</Banner>
              </>}
            </Card>

            <Card n="03" title="Market Information">
              <NumInput label="Municipal Valuation" value={munVal} onChange={set("munVal")} step={25000} min={0} />
              <NumInput label="Listed / Marketed Price" value={listedPrice} onChange={set("listedPrice")} step={10000} min={0} />
              <NumInput label="Days on Market" value={daysOnMarket} onChange={set("daysOnMarket")} step={1} prefix="" min={0} />
              {listedPrice > 0 && arv > 0 && <Row l="Listed vs ARV" v={pct(listedPrice / arv * 100)} tone={listedPrice > arv ? "neg" : "pos"} />}
              {munVal > 0 && arv > 0 && <Row l="ARV vs municipal valuation" v={pct(arv / munVal * 100)} />}
            </Card>

            <Card n="04" title="Seller Bond">
              <NumInput label="Bond Outstanding" value={bondAmount} onChange={set("bondAmount")} step={10000} min={0} />
              <NumInput label="Bond Arrears" value={bondArrears} onChange={set("bondArrears")} step={1000} min={0} />
              <NumInput label="Bond Monthly Instalment" value={bondMonthly} onChange={set("bondMonthly")} step={500} min={0} />
              <Slider label="Bond interest rate" value={bondRate} onChange={set("bondRate")} min={5} max={20} step={0.25} />
              <NumInput label="Bond End Year" value={bondEndYear} onChange={set("bondEndYear")} step={1} prefix="" />
              {bondAmount > 0 && <Row l="Equity in property (ARV − bond)" v={R(arv - bondAmount)} tone={arv - bondAmount > 0 ? "pos" : "neg"} strong />}
            </Card>

            <Card n="05" title="Municipal Costs & Arrears">
              <NumInput label="Rates / Month" value={ratesMonthly} onChange={set("ratesMonthly")} step={100} min={0} />
              <NumInput label="Rates Arrears" value={ratesArrears} onChange={set("ratesArrears")} step={500} min={0} />
              {ptConfig.hasLevy && <NumInput label="Levy Arrears" value={leviesArrears} onChange={set("leviesArrears")} step={500} min={0} />}
              <NumInput label="Water / Sewage / Refuse per Month" value={waterMonthly} onChange={set("waterMonthly")} step={100} min={0} />
              <Toggle label="Tenant pays water/sewage/refuse?" value={tenantPaysWater} onChange={set("tenantPaysWater")} />
              {tenantPaysWater
                ? <Row l="Excluded from your exposure" v={`− ${R(waterMonthly)} / mo`} tone="pos" sub="Tenant covers it directly" />
                : <Banner tone="warn">Counted against you. Municipal service debt attaches to the property, not the person — get a clearance certificate before transfer.</Banner>}
            </Card>

            <Card n="06" title="Electricity & Monthly Exposure">
              <Toggle label="Prepaid meter?" value={elecPrepaid} onChange={set("elecPrepaid")} />
              {!elecPrepaid && <NumInput label="Average Monthly (last 3 months)" value={elecAvg3mo} onChange={set("elecAvg3mo")} step={100} min={0} />}
              <Hero label="Total monthly exposure" value={R(c.totalMonthlyExp)} tone="warn"
                sub={`Rates + levies + water${!elecPrepaid ? " + electricity" : " (electricity prepaid)"}`} />
            </Card>
          </Grid>}

          {/* ═══ NEGOTIATION ══════════════════════════════════ */}
          {tab === 2 && <>
            <Grid cols={2}>
              <Card n="01" title="Seller Price Signals" accent="gold">
                <Note>The first number you hear is rarely the real one. Each figure only counts once the seller has actually said it.</Note>
                <NumInput label="Seller's Motivated Price" value={sellerMotivatedPrice} onChange={set("sellerMotivatedPrice")} step={5000} min={0} />
                <Help>What they'd accept once motivated — leave at R 0 if not yet disclosed.</Help>
                <NumInput label="Seller's Walk-Away Floor" value={sellerWalkAwayPrice} onChange={set("sellerWalkAwayPrice")} step={5000} min={0} />
                <Help>Their rock-bottom once they understand the real cost of their situation.</Help>
                <Toggle label="Prefers installment if the total beats cash?" value={sellerPrefersInstallment} onChange={set("sellerPrefersInstallment")} />
              </Card>

              <Card n="02" title="Negotiation Ladder"
                accent={c.clearsWalkAway || c.clearsMotivated ? "pos" : "warn"}>
                <Row l="Seller's original asking price" v={R(asking)} tone="mut" sub="starting point" />
                {sellerMotivatedPrice > 0 && (
                  <Row l="Seller's motivated price" v={R(sellerMotivatedPrice)} tone={c.clearsMotivated ? "pos" : "warn"}
                    sub={c.clearsMotivated ? "your MAO clears this" : `${R(Math.abs(c.gapToMotivated))} above your MAO`} />
                )}
                {sellerWalkAwayPrice > 0 && (
                  <Row l="Seller's walk-away floor" v={R(sellerWalkAwayPrice)} tone={c.clearsWalkAway ? "pos" : "neg"}
                    sub={c.clearsWalkAway ? "your MAO clears this — closeable" : `${R(Math.abs(c.gapToWalkAway))} above your MAO`} />
                )}
                <Row l={`Your MAO — ${methodLabel(preferredMethod)}`} v={R(c.headlineMao)} tone="gold" strong big />
                <Note>
                  {c.clearsWalkAway
                    ? "Your offer already clears the seller's stated floor — this should be closeable."
                    : c.clearsMotivated
                    ? "You clear their motivated price but not their floor — room to move without hitting your ceiling."
                    : "Your MAO falls short of what the seller says they'd accept. Try the installment structure, or revisit ARV and repairs."}
                  {sellerPrefersInstallment && " They've signalled a preference for installment terms."}
                </Note>
              </Card>
            </Grid>
            <NegotiationLog dealId={dealId} log={negotiationLog || []} onChange={set("negotiationLog")} />
          </>}

          {/* ═══ CASH OFFER ═══════════════════════════════════ */}
          {tab === 3 && <Grid>
            <Card n="01" title="Offer Build-Up" accent="gold" wide>
              <Row l="ARV" v={R(arv)} />
              <Row l={`Gross budget at ${arvPct}%`} v={R(c.gross)} />
              <Row l="Less: estimated repairs" v={`(${R(repairs)})`} tone="neg" />
              <Row l="Less: transfer duty" v={`(${R(c.td)})`} tone="neg" sub="SARS sliding scale" />
              <Row l="Less: conveyancing" v={`(${R(c.cv)})`} tone="neg" sub="incl. 15% VAT" />
              <Row l="Less: minimum profit" v={`(${R(c.minP)})`} tone="warn" sub="greater of R100k or 10% of ARV" />
              {occupied && <Row l="Less: eviction exposure" v={`(${R(c.evictionExposure)})`} tone="neg" />}
              <Hero label="Max Cash Offer" value={R(c.cash)} tone="gold"
                sub={c.gap >= 0 ? `Covers asking — ${R(c.gap)} to negotiate with` : `${R(Math.abs(c.gap))} below asking — seller must move`} />
            </Card>

            <Card n="02" title="Profit & Capital">
              <Row l="Your profit at MCO" v={R(c.cashP)} tone={profitTone} strong big />
              <Row l="Profit as % of ARV" v={arv > 0 ? pct(c.cashP / arv * 100) : "—"} tone={profitTone} />
              <Row l="Total cash deployed" v={R(c.cashIn)} />
              <Row l="Transfer duty" v={R(c.td)} tone="mut" />
              <Row l="Conveyancing" v={R(c.cv)} tone="mut" />
              <Row l="Total acquisition costs" v={R(c.costs + c.evictionExposure)} strong />
            </Card>

            {c.totalArrears > 0 && (
              <Card n="03" title="Arrears Adjustment" accent="warn">
                <Row l="Total arrears to clear" v={R(c.totalArrears)} tone="warn" />
                <Row l="Effective offer after arrears" v={R(c.cash - c.totalArrears)}
                  tone={c.cash - c.totalArrears > 0 ? "gold" : "neg"} strong big />
                <Note>If you settle arrears as part of the deal, reduce your net offer accordingly.</Note>
              </Card>
            )}

            {c.gap < -200000 && (
              <Card n={c.totalArrears > 0 ? "04" : "03"} title="Gap Too Wide" accent="warn">
                <Banner tone="warn">Large gap to asking. An installment structure can bridge this while protecting your spread — see the Installment tab.</Banner>
              </Card>
            )}
          </Grid>}

          {/* ═══ INSTALLMENT (ISA) ════════════════════════════ */}
          {tab === 4 && <>
            {!c.isaViable && (
              <Banner tone="neg">
                At this rent and these costs there is nothing left to pay the seller after your {R(minCashflow)}/month cash flow target
                {takeOverBond ? " and the existing bond instalment" : ""}. Lower the cash flow target, raise the rent assumption, or cut costs.
              </Banner>
            )}
            {occupied && (
              <Banner tone="warn">
                An occupier is flagged on this deal. Per your rule, eviction cost is <strong>not</strong> deducted from the installment MAO —
                it is a warning only. Budget {R(c.evictionExposure)} separately before you commit.
              </Banner>
            )}

            <Grid>
              <Card n="01" title="Your Requirements" accent="gold">
                <NumInput label="Minimum cash flow you need / month" value={minCashflow} onChange={set("minCashflow")} step={250} min={0} />
                <Help>Everything is priced backwards from this number.</Help>
                <Toggle label="Take over the existing bond?" value={takeOverBond} onChange={set("takeOverBond")} />
                {takeOverBond && <>
                  <Row l="Bond balance assumed" v={R(c.isaBondTakeover)} strong />
                  <Row l="Bond instalment" v={`${R(c.isaBondPmt)} / mo`} tone={c.isaBondPmtAssumed ? "warn" : undefined}
                    sub={c.isaBondPmtAssumed ? "Assumed interest-only — enter the real instalment on Due Diligence" : "From Due Diligence tab"} />
                </>}
              </Card>

              <Card n="02" title="Terms You'll Offer">
                <Slider label="Interest rate to the seller" value={instRate} onChange={set("instRate")} min={0} max={24} />
                <Help>0% means a deferred purchase price with no interest.</Help>
                <Slider label="Term to pay it off" value={instYrs} onChange={set("instYrs")} min={5} max={30} suffix=" yrs" />
                <Slider label="Never pay more than this % of ARV" value={isaMaxPctOfArv} onChange={set("isaMaxPctOfArv")} min={70} max={130} suffix="%" />
                <Help>Long, cheap terms can price you above the asset. This caps that.</Help>
              </Card>

              <Card n="03" title="What The Rent Can Carry">
                <Row l={`Rent, less ${vacancy}% vacancy`} v={`${R(c.effRent)} / mo`} />
                <Row l="Less: costs you carry" v={`(${R(c.landlordCosts)})`} tone="neg"
                  sub="Levies, maintenance, rates, insurance, water/elec you pay" />
                <Row l="Net operating income" v={`${R(c.isaNoi)} / mo`} strong />
                <Row l="Less: your cash flow target" v={`(${R(minCashflow)})`} tone="warn" />
                {takeOverBond && <Row l="Less: existing bond instalment" v={`(${R(c.isaBondPmt)})`} tone="neg" />}
                <Hero label="Available for the seller's note" value={`${R(Math.max(0, c.isaSellerPmt))} / mo`}
                  tone={c.isaSellerPmt > 0 ? "pos" : "neg"} sub={`Over ${instYrs} years at ${instRate}%`} />
              </Card>

              <Card n="04" title="The Two Ceilings" accent="sage">
                <Note>Best practice is to take the lower of what the cash flow supports and what the asset is worth.</Note>
                <Row l="Cash-flow ceiling" v={R(c.isaCashflowCeiling)}
                  tone={c.isaBinding === "cashflow" ? "gold" : "mut"} strong={c.isaBinding === "cashflow"}
                  sub={`${R(Math.max(0, c.isaSellerPmt))}/mo financed${takeOverBond ? ` + ${R(c.isaBondTakeover)} bond assumed` : ""}`} />
                <Row l="Value ceiling" v={R(c.isaValueCeiling)}
                  tone={c.isaBinding === "value" ? "gold" : "mut"} strong={c.isaBinding === "value"}
                  sub={`${isaMaxPctOfArv}% of ARV less repairs`} />
                <Hero label="Max Offer Amount (ISA)" value={c.isaViable ? R(c.isaMao) : "Not viable"} tone="gold"
                  sub={c.isaBinding === "cashflow"
                    ? "Cash flow is binding — the rent is the limit"
                    : "Value is binding — you could pay more monthly, but the asset doesn't justify it"} />
              </Card>

              <Card n="05" title="The Deal At That Price">
                <Row l="Paid to seller as a note" v={R(c.isaSellerFinanced)} />
                {takeOverBond && <Row l="Bond taken over" v={R(c.isaBondTakeover)} />}
                <Row l="Monthly to seller" v={`${R(c.isaMonthlyToSeller)} / mo`} tone="gold" strong />
                {takeOverBond && <Row l="Total debt service" v={`${R(c.isaDebtService)} / mo`} strong />}
                <Row l="Your cash flow" v={`${R(c.isaActualCashflow)} / mo`}
                  tone={c.isaActualCashflow >= (minCashflow || 0) ? "pos" : "neg"} strong big />
                <Row l="DSCR" v={c.isaDscr ? num(c.isaDscr, 2) + "×" : "—"}
                  tone={c.isaDscr >= 1.25 ? "pos" : c.isaDscr >= 1 ? "warn" : "neg"}
                  sub="Lenders look for 1.25× or better" />
                <Row l="Total interest over the term" v={R(c.isaInterest)} tone={instRate > 0 ? "neg" : "pos"} />
              </Card>

              <Card n="06" title="Cash In vs Cash Offer">
                <Row l="Max cash offer" v={R(c.cash)} />
                <Row l="Max installment offer" v={R(c.isaMao)} tone="gold" strong />
                <Row l="Extra the seller gets for terms" v={R(c.isaPremiumVsCash)}
                  tone={c.isaPremiumVsCash >= 0 ? "warn" : "pos"}
                  sub={c.isaPremiumVsCash >= 0 ? "Your cost of not using a bank" : "Installment is below your cash ceiling"} />
                <Hero label="Upfront cash needed" value={R(c.isaUpfront)}
                  sub="Repairs + transfer duty + conveyancing at the ISA price" />
              </Card>

              <Card n="07" title="Refinance Exit Assumptions" accent="sage">
                <Slider label="Capital growth you expect per year" value={areaGrowthPct} onChange={set("areaGrowthPct")} min={0} max={15} />
                <Slider label="LTV you'd refinance at" value={targetRefiLtv} onChange={set("targetRefiLtv")} min={50} max={80} />
                <Slider label="Refi costs buffer" value={refiCostsPct} onChange={set("refiCostsPct")} min={0} max={10} />
                <NumInput label="Settle at a specific month (0 = earliest)" value={settlementMonth} onChange={set("settlementMonth")} step={1} prefix="" min={0} />
              </Card>

              <Card n="08" title="Earliest Safe Settlement" accent={c.isaMeetsTarget === false ? "warn" : "pos"} wide>
                {c.isaEarliestMonth === null ? (
                  <Banner tone="warn">The balance never reaches {targetRefiLtv}% LTV within {instYrs} years at these settings.</Banner>
                ) : (
                  <Row l="Earliest eligible settlement" v={monthsLabel(c.isaEarliestMonth)} tone="pos" strong />
                )}
                {c.isaChosenMonth !== null && <>
                  <Row l="Settlement month used" v={monthsLabel(c.isaChosenMonth)} />
                  <Row l="Total owed at that month" v={R(c.isaChosenOwed)} tone="gold" strong
                    sub={takeOverBond ? "Seller note + remaining bond" : "Seller note"} />
                  <Row l="Property value then" v={R(c.isaChosenValue)} />
                  <Row l="LTV at settlement" v={c.isaChosenLtv !== null ? pct(c.isaChosenLtv) : "—"}
                    tone={c.isaMeetsTarget ? "pos" : "warn"} />
                  <Row l="Refi-ready?" v={c.isaMeetsTarget ? "Yes" : "No"} tone={c.isaMeetsTarget ? "pos" : "warn"} />
                  <Row l="Max exposure ceiling at that value" v={R(c.isaRefiCeiling)} sub={`${targetRefiLtv}% + ${refiCostsPct}% costs`} />
                </>}
              </Card>
            </Grid>
          </>}

          {/* ═══ DISPOSITION ══════════════════════════════════ */}
          {tab === 5 && <Grid>
            <Card n="01" title="Buy to Let — Cash">
              <Row l={`Effective rent (${100 - vacancy}% occupied)`} v={R(c.effRent)} />
              <Row l="Less: levies, maintenance" v={`(${R(c.opex)})`} tone="neg" />
              <Row l="Annual ROI on capital" v={c.btlROI !== null ? pct(c.btlROI) : "—"} />
              <Hero label="Monthly cash flow" value={R(c.btlFlow)} tone={flowTone(c.btlFlow)} />
            </Card>

            <Card n="02" title="Buy to Let — Installment">
              <Row l="Cash flow before seller payment" v={R(c.btlFlow)} />
              <Row l="Less: debt service" v={`(${R(c.isaDebtService)})`} tone="neg" />
              <Note>No deposit. The property cash flows while you pay the seller.</Note>
              <Hero label="Net monthly cash flow" value={R(c.btlInstFlow)} tone={flowTone(c.btlInstFlow)} />
            </Card>

            <Card n="03" title="Short-Term Rental">
              <Row l={`Gross (${strOccupancy}% @ ${R(strNightly)}/night)`} v={R(c.strMonthly)} />
              <Row l="Less: platform + management (20%)" v={`(${R(c.strMonthly * 0.2)})`} tone="neg" />
              <Row l="Less: operating costs" v={`(${R(c.opex)})`} tone="neg" />
              <Hero label="Net STR cash flow" value={R(c.strFlow)} tone={flowTone(c.strFlow)} />
            </Card>

            <Card n="04" title="As-Is Value — Pricing Basis" accent="sage">
              <Note>Rent-to-Own and Seller Finance both price at 120% of this figure.</Note>
              <Row l="ARV − repairs" v={R(c.asIsAuto)} tone={!rtoAsIsOverrideOn ? "gold" : "mut"} strong={!rtoAsIsOverrideOn} />
              <Toggle label="Override as-is value?" value={rtoAsIsOverrideOn} onChange={set("rtoAsIsOverrideOn")} />
              {rtoAsIsOverrideOn && <NumInput label="As-Is Value (override)" value={rtoAsIsOverride} onChange={set("rtoAsIsOverride")} step={10000} min={0} />}
              <Hero label="As-is value used" value={R(c.asIsValue)} tone="gold" />
            </Card>

            <Card n="05" title="Rent-to-Own (Lease Option)">
              <Row l="Purchase price (120% of as-is)" v={R(c.rtoPrice)} strong />
              <Slider label="Option term" value={rtoTerm} onChange={set("rtoTerm")} min={1} max={5} suffix=" yrs" />
              <Row l={`Monthly (${R(rentalHigh)} × 110%)`} v={R(c.rtoMonthly)} tone="pos" strong />
              <Row l={`Lease option fee (${c.rtoLofPct}%)`} v={R(c.rtoOptionFee)} tone="gold" sub="Non-refundable, forfeited on default" />
              <Row l="Price if exercised" v={R(c.rtoPriceIfExercised)} sub="Only if they complete with no default" />
              <Row l="Less: your debt service" v={`(${R(c.isaDebtService)})`} tone="neg" />
              <Hero label="Net monthly spread" value={R(c.rtoSpread)} tone={flowTone(c.rtoSpread)} />
            </Card>

            <Card n="06" title="Seller Finance to End Buyer">
              <Row l="Sale price (120% of as-is)" v={R(c.sfp)} strong />
              <Slider label="Deposit from buyer" value={sfDepositPct} onChange={set("sfDepositPct")} min={0} max={30} />
              <Slider label="Term" value={sfYrs} onChange={set("sfYrs")} min={5} max={30} suffix=" yrs" />
              <Row l="Interest rate (fixed by deposit tier)" v={pct(c.sfRate, 0)} tone="gold"
                sub="0%→18% · 1–5%→16% · 6–10%→15% · >10%→14%" />
              <Row l="Deposit amount" v={R(c.sfDepositAmt)} tone="pos" />
              <Row l="Loan financed" v={R(c.sfLoanAmt)} />
              <Row l="Monthly income" v={R(c.sfM)} tone="pos" strong />
              <Row l="Less: your debt service" v={`(${R(c.isaDebtService)})`} tone="neg" />
              <Row l="Total over full term" v={R(c.sfTotal)} />
              <NumInput label="Early settlement month (0 = not set)" value={sfSettlementMonth} onChange={set("sfSettlementMonth")} step={1} prefix="" min={0} />
              {c.sfChosenMonth !== null && <Row l="Buyer settles at" v={R(c.sfSettleBalance)} tone="gold" strong />}
              <Hero label="Net monthly spread" value={R(c.sfSpread)} tone={flowTone(c.sfSpread)} />
            </Card>

            <Card n="07" title="Flip & Sell">
              <Row l="Sale at ARV" v={R(arv)} />
              <Row l="Less: buy + repairs + costs" v={`(${R(c.cashIn)})`} tone="neg" />
              <Row l={`Less: selling costs (${flipPct}%)`} v={`(${R(c.flipSell)})`} tone="neg" />
              <Hero label="Flip profit" value={R(c.flipProfit)} tone={scoreTone(c.flipProfit, arv)} />
            </Card>

            <Card n="08" title="BRRRR" wide>
              <Slider label="Refinance LTV" value={bLtv} onChange={set("bLtv")} min={10} max={100} />
              <Slider label="New bond rate" value={bRate} onChange={set("bRate")} min={5} max={25} step={0.5} />
              <Slider label="Bond period" value={bBondYears} onChange={set("bBondYears")} min={1} max={30} suffix=" yrs" />
              <Toggle label="Interest only" value={bInterestOnly} onChange={set("bInterestOnly")} />
              <Row l="Refinance amount" v={R(c.refAmt)} />
              <Row l="Total invested" v={R(c.cashIn)} />
              <Row l="Cash left in deal" v={R(c.cashLeft)} tone={c.cashLeft < 50000 ? "pos" : "warn"} strong />
              {c.cashOut > 0 && <Row l="Cash pulled out" v={R(c.cashOut)} tone="pos" />}
              <Row l={`Bond payment${bInterestOnly ? " (interest only)" : ""}`} v={R(c.bPmt)} tone="neg" />
              {c.bCoC !== null && <Row l="Cash-on-cash ROI" v={pct(c.bCoC)} tone={flowTone(c.brrrrFlow)} />}
              <Hero label="Monthly cash flow after bond" value={R(c.brrrrFlow)} tone={flowTone(c.brrrrFlow)} />
            </Card>
          </Grid>}

          {/* ═══ SUMMARY ══════════════════════════════════════ */}
          {tab === 6 && <>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
              <Btn kind="ghost" onClick={() => downloadSummaryPdf(inp, c)}>Download PDF</Btn>
            </div>

            {(warnAsking || warnGut) && (
              <Banner tone="warn">One or more valuation inputs are far outside normal range vs ARV. Double-check them before sharing this summary.</Banner>
            )}
            {occupied && (
              <Banner tone="neg">
                Occupier on site — a {evictionMonths}-month PIE Act process and {R(c.evictionExposure)} in costs sit outside the installment
                MAO. Factor this into your timeline before committing.
              </Banner>
            )}

            <Grid>
              <Card n="01" title="Deal Snapshot" accent="gold">
                <Row l="Property type" v={ptConfig.label} tone="mut" />
                <Row l="ARV" v={R(arv)} />
                <Row l="Owner's value" v={R(gutFeel)} tone="mut" />
                <Row l="Seller asking" v={R(asking)} />
                {sellerMotivatedPrice > 0 && <Row l="Motivated price" v={R(sellerMotivatedPrice)} tone="warn" />}
                {sellerWalkAwayPrice > 0 && <Row l="Walk-away floor" v={R(sellerWalkAwayPrice)} tone="warn" />}
                <Hero label={`Max offer — ${methodLabel(preferredMethod)}`} value={R(c.headlineMao)} tone="gold"
                  sub={c.gap >= 0 ? `${R(c.gap)} below asking` : `${R(Math.abs(c.gap))} short of asking`} />
              </Card>

              <Card n="02" title="Both Structures">
                <Row l="Max cash offer" v={R(c.cash)} strong />
                <Row l="Profit at cash MCO" v={R(c.cashP)} tone={profitTone} />
                <div className="ns-divider" />
                <Row l="Max installment offer" v={c.isaViable ? R(c.isaMao) : "Not viable"} strong />
                <Row l="Cash flow under ISA" v={`${R(c.isaActualCashflow)} / mo`} tone={flowTone(c.isaActualCashflow)} />
                <Row l="DSCR" v={c.isaDscr ? num(c.isaDscr, 2) + "×" : "—"} tone={c.isaDscr >= 1.25 ? "pos" : "warn"} />
              </Card>

              <Card n="03" title="Risk Profile" accent={c.riskLevel === "low" ? "pos" : c.riskLevel === "high" ? "neg" : "warn"}>
                <div style={{ marginBottom: 12 }}><RiskBadge level={c.riskLevel} /></div>
                <Row l="Total monthly exposure" v={R(c.totalMonthlyExp)} />
                <Row l="Total arrears" v={R(c.totalArrears)} tone={c.totalArrears > 0 ? "warn" : "pos"} />
                <Row l="Seller bond outstanding" v={bondAmount > 0 ? R(bondAmount) : "—"} />
                <Row l="Occupier" v={occupied ? OCCUPIER_TYPES.find((o) => o.value === occupierType)?.label || "Yes" : "No"}
                  tone={occupied ? "neg" : "pos"} />
              </Card>

              <Card n="04" title="Exit Strategy Comparison" wide>
                <Row l="Flip profit (once-off)" v={R(c.flipProfit)} tone={scoreTone(c.flipProfit, arv)} />
                <Row l="Buy to let — cash purchase" v={`${R(c.btlFlow)} / mo`} tone={flowTone(c.btlFlow)} />
                <Row l="Buy to let — installment purchase" v={`${R(c.btlInstFlow)} / mo`} tone={flowTone(c.btlInstFlow)} />
                <Row l="Short-term rental" v={`${R(c.strFlow)} / mo`} tone={flowTone(c.strFlow)} />
                <Row l="Rent-to-own spread" v={`${R(c.rtoSpread)} / mo`} tone={flowTone(c.rtoSpread)} />
                <Row l="Seller finance to buyer" v={`${R(c.sfSpread)} / mo`} tone={flowTone(c.sfSpread)} />
                <Row l="BRRRR after refinance" v={`${R(c.brrrrFlow)} / mo`} tone={flowTone(c.brrrrFlow)} />
              </Card>

              <Card n="05" title="Verdict" accent={profitTone === "pos" ? "pos" : profitTone === "warn" ? "warn" : "neg"}>
                <Note>
                  {arv > 0 && c.cashP / arv >= 0.12
                    ? `Strong at a cash offer of ${R(c.cash)} — profit of ${R(c.cashP)} (${pct(c.cashP / arv * 100)} of ARV).`
                    : arv > 0 && c.cashP / arv >= 0.06
                    ? `Marginal on cash. Profit of ${R(c.cashP)} is thin — the installment structure gives the seller their price over time while protecting your spread.`
                    : `Weak on cash at these numbers. The installment route is where this deal lives, if anywhere.`}
                </Note>
                {sellerWalkAwayPrice > 0 && (
                  <Banner tone={c.clearsWalkAway ? "pos" : "warn"}>
                    {c.clearsWalkAway
                      ? `Your MAO clears the seller's stated floor of ${R(sellerWalkAwayPrice)}.`
                      : `Your MAO is ${R(Math.abs(c.gapToWalkAway))} short of the seller's stated floor.`}
                  </Banner>
                )}
              </Card>

              <Card n="06" title="Notes" full>
                <Note>Anything worth remembering — included in the PDF download.</Note>
                <textarea className="ns-textarea" rows={5} value={summaryNotes}
                  onChange={(e) => set("summaryNotes")(e.target.value)}
                  placeholder="Conditions discussed, next steps, follow-up date…" />
              </Card>
            </Grid>

            <Card full title="Sign-Off" accent={approved ? "pos" : "gold"}>
              {approved ? (
                <>
                  <Banner tone="pos">
                    Approved{inp.approvedAt ? ` on ${new Date(inp.approvedAt).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" })}` : ""} —
                    this deal shows as analysed on the dashboard.
                  </Banner>
                  <Btn kind="ghost" onClick={() => { setInp((p) => ({ ...p, approved: false, approvedAt: null })); setSelfChecked(false); }}>
                    Move back to unanalysed
                  </Btn>
                </>
              ) : (
                <>
                  <Note>Approving moves this deal out of the new-leads lane on your dashboard.</Note>
                  <Check checked={selfChecked} onChange={setSelfChecked}>
                    I have personally checked these numbers — ARV, repairs, rent, costs and the seller's figures — and I'm satisfied they're right.
                  </Check>
                  <Btn kind="approve" disabled={!selfChecked}
                    onClick={() => setInp((p) => ({ ...p, approved: true, approvedAt: new Date().toISOString() }))}>
                    Approve this deal
                  </Btn>
                </>
              )}
            </Card>
          </>}

          {/* ═══ DOCUMENTS ════════════════════════════════════ */}
          {tab === DOCS_TAB && (
            <>
              {!approved && (
                <Banner tone="warn">
                  This deal hasn't been approved yet. You can still generate, but the offer price comes straight off
                  unconfirmed numbers — check the Summary tab first.
                </Banner>
              )}
              <DocumentGenerator
                inp={inp}
                c={c}
                doc={doc}
                setDoc={setDoc}
                onExposeApi={(api) => { window.NSC = Object.assign(window.NSC || {}, api); }}
              />
            </>
          )}
        </div>
      </div>

      {showDelete && (
        <Modal
          title="Delete this deal permanently?"
          body={<>
            <strong>{clientName || "This deal"}</strong>{propAddress ? ` — ${propAddress}` : ""} will be removed from the database along with
            all inputs, notes and conversation history. This cannot be undone.
          </>}
          confirmLabel={deleting ? "Deleting…" : "Yes, delete permanently"}
          confirmDisabled={deleting}
          onConfirm={reallyDelete}
          onCancel={() => setShowDelete(false)}
        />
      )}
    </div>
  );
}
