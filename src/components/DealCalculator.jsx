import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";
import {
  C, R, pct, scoreColor, flowColor, defaultInputs, computeDeal, OCCUPIER_TYPES,
  PROPERTY_TYPES, propertyTypeConfig,
} from "../lib/calc.js";
import {
  Label, NumInput, TextInput, Slider, Row, Card, Sec, BigOffer, Toggle,
  SegButtons, ExitRow, InfoRow, RiskBadge, WarningBanner,
} from "./ui.jsx";
import NegotiationLog from "./NegotiationLog.jsx";
import { downloadSummaryPdf } from "../lib/pdf.js";

function monthsLabel(m) {
  if (m === null || m === undefined || !isFinite(m)) return "—";
  const yrs = m / 12;
  return `Month ${Math.round(m)} (~${yrs.toFixed(1)} yrs)`;
}

const TABS = ["Inputs", "Due Diligence", "Negotiation", "Cash Offer", "Installment", "Disposition", "Summary"];

export default function DealCalculator({ dealId, onBack }) {
  const [tab, setTab] = useState(0);
  const [inp, setInp] = useState(null); // null while loading
  const [loadError, setLoadError] = useState(null);
  const [saveState, setSaveState] = useState("idle"); // idle | saving | saved | error
  const saveTimer = useRef(null);
  const latestInp = useRef(null);

  // ── Load deal ──────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.from("deals").select("*").eq("id", dealId).single();
      if (cancelled) return;
      if (error) {
        setLoadError(error.message);
        return;
      }
      const merged = { ...defaultInputs(), ...(data.inputs || {}), clientName: data.client_name || "", propAddress: data.property_address || "" };
      setInp(merged);
    })();
    return () => { cancelled = true; };
  }, [dealId]);

  // ── Debounced autosave ─────────────────────────────────────────
  useEffect(() => {
    if (!inp) return;
    latestInp.current = inp;
    setSaveState("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const payload = latestInp.current;
      const { error } = await supabase
        .from("deals")
        .update({
          client_name: payload.clientName,
          property_address: payload.propAddress,
          inputs: payload,
        })
        .eq("id", dealId);
      setSaveState(error ? "error" : "saved");
    }, 900);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inp, dealId]);

  const set = (key) => (value) => setInp((prev) => ({ ...prev, [key]: value }));

  const c = useMemo(() => (inp ? computeDeal(inp) : null), [inp]);

  if (loadError) {
    return (
      <div style={{ background: C.bg, minHeight: "100vh", color: C.text, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'Inter', system-ui, sans-serif" }}>
        <div style={{ maxWidth: 400, textAlign: "center" }}>
          <div style={{ color: C.red, fontWeight: 700, marginBottom: 8 }}>Couldn't load this deal</div>
          <div style={{ color: C.sub, fontSize: 13, marginBottom: 16 }}>{loadError}</div>
          <button onClick={onBack} style={{ background: C.blue, color: "#fff", border: "none", borderRadius: 8, padding: "10px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>← Back to deals</button>
        </div>
      </div>
    );
  }

  if (!inp || !c) {
    return (
      <div style={{ background: C.bg, minHeight: "100vh", color: C.sub, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', system-ui, sans-serif", fontSize: 13 }}>
        Loading deal…
      </div>
    );
  }

  const {
    clientName, propAddress, arv, arvPct, repairs, rental, rentalHigh, asking, gutFeel,
    propertyType,
    vacancy, levies, maint, flipPct,
    instRate, instYrs, areaGrowthPct, targetRefiLtv, refiCostsPct, settlementMonth,
    sfDepositPct, sfYrs, sfSettlementMonth, rtoAsIsOverrideOn, rtoAsIsOverride, rtoTerm,
    strNightly, strOccupancy, bLtv, bRate, bBondYears, bInterestOnly,
    munVal, listedPrice, daysOnMarket,
    bondAmount, bondArrears, bondMonthly, bondEndYear,
    ratesMonthly, ratesArrears, leviesArrears, waterMonthly, tenantPaysWater,
    elecPrepaid, elecAvg3mo,
    occupied, occupierType, evictionMonths, evictionLegalCost, evictionHoldingMonthly,
    sellerMotivatedPrice, sellerWalkAwayPrice, sellerPrefersInstallment, negotiationLog,
    summaryNotes,
  } = inp;

  const offerColor = scoreColor(c.cashP, arv);
  const askingVsArvRatio = arv > 0 ? asking / arv : 0;
  const gutFeelVsArvRatio = arv > 0 ? gutFeel / arv : 0;
  const showAskingSanityWarning = arv > 0 && askingVsArvRatio >= 3;
  const showGutFeelSanityWarning = arv > 0 && gutFeelVsArvRatio >= 3 && Math.abs(gutFeel - asking) > 1;
  const ptConfig = propertyTypeConfig(propertyType);

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "'Inter', system-ui, -apple-system, sans-serif", display: "flex", flexDirection: "column" }}>

      {/* ── Header ──────────────────────────────────────────────────────────────── */}
      <div style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: "14px 18px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", width: "100%" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, gap: 10 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, minWidth: 0 }}>
              <button
                onClick={onBack}
                title="Back to deals"
                style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, color: C.dim, width: 32, height: 32, flexShrink: 0, cursor: "pointer", fontSize: 14 }}
              >
                ←
              </button>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.3px" }}>Nine Stones Capital</div>
                <div style={{ fontSize: 10, color: C.sub, letterSpacing: "1.5px", fontWeight: 700, textTransform: "uppercase", marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
                  Deal Analyser
                  <span style={{ color: saveState === "error" ? C.red : C.sub, textTransform: "none", letterSpacing: 0, fontWeight: 500 }}>
                    {saveState === "saving" && "· saving…"}
                    {saveState === "saved" && "· saved"}
                    {saveState === "error" && "· save failed"}
                  </span>
                </div>
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: 10, color: C.sub, letterSpacing: "1px", textTransform: "uppercase" }}>ARV</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: C.blueL, fontVariantNumeric: "tabular-nums" }}>{R(arv)}</div>
            </div>
          </div>

          {(clientName || propAddress) && (
            <div style={{ background: C.bg, borderRadius: 8, padding: "7px 12px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{clientName || "—"}</div>
              <div style={{ fontSize: 11, color: C.sub, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{propAddress || ""}</div>
            </div>
          )}

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.sub, marginBottom: 4 }}>
              <span>DEAL QUALITY</span>
              <span style={{ color: offerColor, fontWeight: 700 }}>
                {arv > 0 && c.cashP / arv >= 0.12 ? "STRONG" : arv > 0 && c.cashP / arv >= 0.06 ? "MARGINAL" : "WEAK"}
              </span>
            </div>
            <div style={{ height: 4, background: C.border, borderRadius: 2, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${arv > 0 ? Math.max(0, Math.min(100, c.cashP / arv * 700)) : 0}%`, background: offerColor, borderRadius: 2, transition: "width .4s, background .4s" }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────────────── */}
      <div style={{ background: C.card, borderBottom: `1px solid ${C.border}`, display: "flex", overflowX: "auto" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", width: "100%", display: "flex" }}>
          {TABS.map((t, i) => (
            <button key={i} onClick={() => setTab(i)}
              style={{ padding: "11px 13px", fontSize: 11, fontWeight: 600, border: "none", background: "none", color: tab === i ? C.blueL : C.sub, borderBottom: tab === i ? `2px solid ${C.blueL}` : "2px solid transparent", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", letterSpacing: "0.3px" }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>

        {/* ═══ TAB 0: INPUTS ══════════════════════════════════ */}
        {tab === 0 && <>
          <Card>
            <Sec>Client & Property</Sec>
            <TextInput label="Client / Seller Name" value={clientName} onChange={set("clientName")} placeholder="e.g. J. Smith" />
            <TextInput label="Property Address" value={propAddress} onChange={set("propAddress")} placeholder="e.g. 12 Oak Ave, Pretoria" />
          </Card>
          <Card>
            <Sec>Property Type</Sec>
            <SegButtons
              label="Sectional title, HOA/estate, or plain freehold?"
              value={propertyType}
              onChange={set("propertyType")}
              options={PROPERTY_TYPES.map((p) => ({ value: p.value, label: p.label }))}
            />
            <div style={{ fontSize: 11.5, color: C.sub, lineHeight: 1.5 }}>{ptConfig.desc}</div>
          </Card>
          <Card>
            <Sec>Property Valuation</Sec>
            {showAskingSanityWarning && (
              <WarningBanner>
                ⚠️ Asking price is {askingVsArvRatio.toFixed(1)}× your ARV. That's far outside normal range — check for a data-entry error (e.g. extra zeros, or the wrong figure was captured from the lead) before using it in negotiations.
              </WarningBanner>
            )}
            {showGutFeelSanityWarning && (
              <WarningBanner>
                ⚠️ Gut-feel / owner's value is {gutFeelVsArvRatio.toFixed(1)}× your ARV. Verify against comparable sales before relying on it.
              </WarningBanner>
            )}
            <NumInput label="After Repair Value (ARV)" value={arv} onChange={set("arv")} step={25000} min={0} />
            <NumInput label="Your Gut-Feel Value" value={gutFeel} onChange={set("gutFeel")} step={25000} min={0} />
            <NumInput label="Seller Asking Price" value={asking} onChange={set("asking")} step={10000} min={0} />
            <NumInput label="Estimated Repairs" value={repairs} onChange={set("repairs")} step={5000} min={0} />
            <Slider label="ARV % — acquisition ceiling" value={arvPct} onChange={set("arvPct")} min={65} max={95} />
          </Card>
          <Card>
            <Sec>Income</Sec>
            <NumInput label="LTR Market Rental / Month" value={rental} onChange={set("rental")} step={500} min={0} />
            <NumInput label="Market Rental — Top of Range" value={rentalHigh} onChange={set("rentalHigh")} step={500} min={0} />
            <div style={{ fontSize: 11, color: C.sub, marginTop: -10, marginBottom: 14 }}>Top end of the area's rent range — drives the Rent-to-Own monthly rate (110% of this figure) on the Disposition tab.</div>
            <NumInput label="STR Avg Nightly Rate" value={strNightly} onChange={set("strNightly")} step={100} min={0} />
            <Slider label="STR Occupancy Rate" value={strOccupancy} onChange={set("strOccupancy")} min={30} max={95} />
          </Card>
          <Card>
            <Sec>BTL Operating Costs</Sec>
            <Slider label="Vacancy Rate" value={vacancy} onChange={set("vacancy")} min={0} max={25} />
            {ptConfig.hasLevy ? (
              <NumInput label={ptConfig.levyLabel} value={levies} onChange={set("levies")} step={100} min={0} />
            ) : (
              <div style={{ fontSize: 11.5, color: C.sub, marginBottom: 14, background: C.bg, borderRadius: 8, padding: "9px 12px" }}>
                No levy — freehold with no HOA/body corporate.
              </div>
            )}
            <NumInput label="Maintenance Reserve / Month" value={maint} onChange={set("maint")} step={100} min={0} />
          </Card>
          <Card>
            <Sec>Flip Selling Costs</Sec>
            <Slider label="Agent + Attorney + CGT (as % of ARV)" value={flipPct} onChange={set("flipPct")} min={3} max={15} />
          </Card>
        </>}

        {/* ═══ TAB 1: DUE DILIGENCE ══════════════════════════════════ */}
        {tab === 1 && <>

          <Card accent={c.riskLevel === "low" ? C.green : c.riskLevel === "high" ? C.red : C.amber}>
            <Sec>Risk Assessment</Sec>
            <RiskBadge level={c.riskLevel} />
            <div style={{ marginTop: 12 }}>
              <Row l="Total arrears" v={R(c.totalArrears)} color={c.totalArrears > 50000 ? C.red : c.totalArrears > 15000 ? C.amber : C.green} bold />
              <Row l="Bond vs ARV" v={bondAmount > 0 && arv > 0 ? pct(bondAmount / arv * 100) : "—"} color={bondAmount > arv * 0.75 ? C.red : bondAmount > arv * 0.55 ? C.amber : C.green} sep={occupied} />
              {occupied && <Row l="Unlawful occupier present" v="⚠️ Yes" color={C.red} bold sep={false} />}
            </div>
          </Card>

          <Card accent={occupied ? C.red : undefined}>
            <Sec>Occupancy & Eviction Risk</Sec>
            <Toggle label="Occupied by unlawful occupier / non-paying tenant?" value={occupied} onChange={set("occupied")} />
            {occupied && (
              <>
                <SegButtons label="Occupier type" value={occupierType} onChange={set("occupierType")} options={OCCUPIER_TYPES} />
                <Slider label="Estimated PIE Act eviction timeline" value={evictionMonths} onChange={set("evictionMonths")} min={3} max={24} suffix=" mo" />
                <NumInput label="Estimated legal & sheriff costs" value={evictionLegalCost} onChange={set("evictionLegalCost")} step={5000} min={0} />
                <NumInput label="Monthly holding cost during eviction" value={evictionHoldingMonthly} onChange={set("evictionHoldingMonthly")} step={500} min={0} />
                <div style={{ fontSize: 11, color: C.sub, marginTop: -6, marginBottom: 12 }}>Leave at R 0 to use total monthly exposure (rates + levies + water{!elecPrepaid ? " + electricity" : ""}) automatically.</div>
                <InfoRow label="Holding cost used" value={R(c.evictHoldMonthly) + " / mo"} />
                <InfoRow label="Total eviction exposure" value={R(c.evictionExposure)} color={C.red} sub="Deducted from your Max Cash Offer" />
                <div style={{ background: C.bg, borderRadius: 8, padding: "10px 12px", marginTop: 10, fontSize: 11.5, color: C.sub, lineHeight: 1.6 }}>
                  South Africa's PIE Act (Prevention of Illegal Eviction Act) requires a court order before removing an occupier, even a non-paying one. Process typically runs 6–18 months depending on the court roll and whether the occupier is vulnerable (elderly, children, disabled). Budget for legal fees, holding costs, and the possibility the occupier is granted alternative accommodation obligations by the municipality. Do not attempt a self-help eviction — it's a criminal offence.
                </div>
              </>
            )}
          </Card>

          <Card>
            <Sec>Market Information</Sec>
            <NumInput label="Municipal Valuation" value={munVal} onChange={set("munVal")} step={25000} min={0} />
            <NumInput label="Listed / Marketed Price" value={listedPrice} onChange={set("listedPrice")} step={10000} min={0} />
            <NumInput label="Days on Market" value={daysOnMarket} onChange={set("daysOnMarket")} step={1} prefix="" min={0} />
            {listedPrice > 0 && arv > 0 && (
              <InfoRow label="Listed vs ARV" value={pct(listedPrice / arv * 100)} color={listedPrice > arv ? C.red : C.green} />
            )}
            {munVal > 0 && arv > 0 && (
              <InfoRow label="ARV vs Muni Valuation" value={pct(arv / munVal * 100)} sub="ARV as % of muni val" />
            )}
          </Card>

          <Card>
            <Sec>Seller Bond</Sec>
            <NumInput label="Bond Outstanding Amount" value={bondAmount} onChange={set("bondAmount")} step={10000} min={0} />
            <NumInput label="Bond Arrears" value={bondArrears} onChange={set("bondArrears")} step={1000} min={0} />
            <NumInput label="Bond Monthly Instalment" value={bondMonthly} onChange={set("bondMonthly")} step={500} min={0} />
            <NumInput label="Bond End Year" value={bondEndYear} onChange={set("bondEndYear")} step={1} prefix="" />
            {bondAmount > 0 && (
              <>
                <InfoRow label="Equity in property (ARV – bond)" value={R(arv - bondAmount)} color={arv - bondAmount > 0 ? C.green : C.red} />
                <InfoRow label="Bond end" value={`${bondEndYear} (${bondEndYear - new Date().getFullYear()} yrs)`} />
              </>
            )}
          </Card>

          <Card>
            <Sec>Municipal Costs & Arrears</Sec>
            <NumInput label="Rates Monthly" value={ratesMonthly} onChange={set("ratesMonthly")} step={100} min={0} />
            <NumInput label="Rates Arrears" value={ratesArrears} onChange={set("ratesArrears")} step={500} min={0} />
            {ptConfig.hasLevy ? (
              <>
                <NumInput label={`${ptConfig.levyLabel.replace(" / Month", "")} Monthly`} value={levies} onChange={set("levies")} step={100} min={0} />
                <NumInput label={`${ptConfig.levyLabel.replace(" / Month", "")} Arrears`} value={leviesArrears} onChange={set("leviesArrears")} step={500} min={0} />
              </>
            ) : (
              <div style={{ fontSize: 11.5, color: C.sub, marginBottom: 14, background: C.bg, borderRadius: 8, padding: "9px 12px" }}>
                No levy/HOA on this property (freehold, no HOA) — skipped.
              </div>
            )}
            <NumInput label="Water / Municipal Monthly" value={waterMonthly} onChange={set("waterMonthly")} step={100} min={0} />
            <Toggle label="Tenant pays water/sewage/refuse?" value={tenantPaysWater} onChange={set("tenantPaysWater")} />
            {tenantPaysWater ? (
              <InfoRow label="Excluded from your exposure" value={`− ${R(waterMonthly)} / mo`} color={C.green} sub="Tenant covers it directly, not counted against you" />
            ) : (
              <div style={{ fontSize: 11.5, color: C.amber, marginTop: -8, marginBottom: 8, lineHeight: 1.5 }}>
                ⚠️ Added to your monthly exposure below. If there's a non-paying occupier, remember municipal service debt (water included) attaches to the property, not just the person who ran it up — get a clearance certificate before transfer.
              </div>
            )}
          </Card>

          <Card>
            <Sec>Electricity</Sec>
            <Toggle label="Prepaid meter?" value={elecPrepaid} onChange={set("elecPrepaid")} />
            {!elecPrepaid && (
              <NumInput label="Average Monthly (last 3 months)" value={elecAvg3mo} onChange={set("elecAvg3mo")} step={100} min={0} />
            )}
            <div style={{ background: C.bg, borderRadius: 8, padding: "10px 12px", marginTop: 8 }}>
              <div style={{ fontSize: 11, color: C.sub, marginBottom: 6, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700 }}>Total Monthly Exposure</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: C.amber, fontVariantNumeric: "tabular-nums" }}>{R(c.totalMonthlyExp)}</div>
              <div style={{ fontSize: 11, color: C.sub, marginTop: 4 }}>Rates + levies + water{!elecPrepaid ? " + electricity" : " (electricity prepaid)"}</div>
            </div>
          </Card>
        </>}

        {/* ═══ TAB 2: NEGOTIATION ══════════════════════════════════ */}
        {tab === 2 && <>
          <Card>
            <Sec>Seller Price Signals</Sec>
            <div style={{ fontSize: 12, color: C.sub, marginBottom: 14, lineHeight: 1.5 }}>
              Real deals move through rounds — the first number you hear is rarely the real one. Update these as conversations progress; each figure only counts once the seller has actually said it.
            </div>
            <NumInput label="Seller's Motivated Price" value={sellerMotivatedPrice} onChange={set("sellerMotivatedPrice")} step={5000} min={0} />
            <div style={{ fontSize: 11, color: C.sub, marginTop: -10, marginBottom: 14 }}>What they'd accept once motivated (e.g. wants the problem gone) — leave at R 0 if not yet disclosed.</div>
            <NumInput label="Seller's Walk-Away Floor (cash)" value={sellerWalkAwayPrice} onChange={set("sellerWalkAwayPrice")} step={5000} min={0} />
            <div style={{ fontSize: 11, color: C.sub, marginTop: -10, marginBottom: 14 }}>Their rock-bottom number once they understand the real cost/pain of their situation (e.g. eviction) — leave at R 0 if not yet disclosed.</div>
            <Toggle label="Prefers an installment sale if total exceeds cash floor?" value={sellerPrefersInstallment} onChange={set("sellerPrefersInstallment")} />
          </Card>

          {(sellerMotivatedPrice > 0 || sellerWalkAwayPrice > 0) && (
            <Card accent={c.clearsWalkAway || c.clearsMotivated ? C.green : C.amber}>
              <Sec>Negotiation Ladder</Sec>
              <ExitRow icon="🏷️" label="Seller's original asking price" note="starting point" value={R(asking)} color={C.dim} />
              {sellerMotivatedPrice > 0 && (
                <ExitRow icon="🤝" label="Seller's motivated price" note={c.clearsMotivated ? "your MCO already clears this" : c.gapToMotivated !== null ? `${R(Math.abs(c.gapToMotivated))} ${c.gapToMotivated >= 0 ? "above" : "short of"} your MCO` : ""}
                  value={R(sellerMotivatedPrice)} color={c.clearsMotivated ? C.green : C.amber} />
              )}
              {sellerWalkAwayPrice > 0 && (
                <ExitRow icon="🚪" label="Seller's walk-away floor" note={c.clearsWalkAway ? "your MCO already clears this — deal is closeable" : c.gapToWalkAway !== null ? `${R(Math.abs(c.gapToWalkAway))} short of your MCO` : ""}
                  value={R(sellerWalkAwayPrice)} color={c.clearsWalkAway ? C.green : C.red} />
              )}
              <ExitRow icon="💰" label="Your Max Cash Offer" note="from Cash Offer tab" value={R(c.cash)} color={offerColor} />
              <div style={{ fontSize: 11.5, color: C.sub, marginTop: 8, lineHeight: 1.6 }}>
                {c.clearsWalkAway
                  ? "Your data-driven offer already clears the seller's stated floor — this deal should be closeable at or near MCO."
                  : c.clearsMotivated
                  ? "Your MCO clears their motivated price but not their floor — you likely have room without going to your ceiling."
                  : "Your MCO falls short of what the seller has said they'd accept. Consider a structured/installment offer, or revisit repairs/ARV assumptions before walking away."}
                {sellerPrefersInstallment && " They've indicated a preference for installment terms if the total is higher than a cash lump sum — see the Installment tab to structure that."}
              </div>
            </Card>
          )}

          <NegotiationLog dealId={dealId} log={negotiationLog || []} onChange={set("negotiationLog")} />
        </>}

        {/* ═══ TAB 3: CASH OFFER ══════════════════════════════════ */}
        {tab === 3 && <>
          <Card>
            <Sec>Offer Build-Up</Sec>
            <Row l="ARV" v={R(arv)} />
            <Row l={`Gross budget at ${arvPct}%`} v={R(c.gross)} />
            <Row l="Less: estimated repairs" v={`(${R(repairs)})`} color={C.red} />
            <Row l="Less: transfer duty" v={`(${R(c.td)})`} color={C.red} sub="SARS 2025 sliding scale, auto-calculated" />
            <Row l="Less: conveyancing (est.)" v={`(${R(c.cv)})`} color={C.red} sub="Incl. 15% VAT on attorney tariff" />
            <Row l="Less: minimum profit" v={`(${R(c.minP)})`} color={C.amber} sub="Greater of R100k or 10% of ARV" sep={occupied} />
            {occupied && <Row l="Less: eviction/occupier exposure" v={`(${R(c.evictionExposure)})`} color={C.red} sub="Legal costs + holding costs during PIE Act process" sep={false} />}
            <BigOffer
              label="Max Cash Offer (Wholesale)"
              value={R(c.cash)}
              color={offerColor}
              sub={c.gap >= 0
                ? `Covers asking — ${R(c.gap)} buffer to negotiate`
                : `${R(Math.abs(c.gap))} below asking — seller must move or walk`}
            />
          </Card>
          {c.totalArrears > 0 && (
            <Card accent={C.amber}>
              <Sec>Arrears Adjustment</Sec>
              <Row l="Total arrears to clear" v={R(c.totalArrears)} color={C.amber} />
              <Row l="Effective offer after arrears" v={R(c.cash - c.totalArrears)} color={c.cash - c.totalArrears > 0 ? C.blueL : C.red} bold sep={false} />
              <div style={{ fontSize: 11, color: C.sub, marginTop: 8, lineHeight: 1.5 }}>
                If you settle arrears as part of the deal, reduce your net offer accordingly.
              </div>
            </Card>
          )}
          <Card>
            <Sec>Profit at MCO</Sec>
            <Row l="Your profit" v={R(c.cashP)} color={scoreColor(c.cashP, arv)} bold />
            <Row l="Profit as % of ARV" v={arv > 0 ? pct(c.cashP / arv * 100) : "—"} color={scoreColor(c.cashP, arv)} />
            <Row l="Total cash deployed" v={R(c.cashIn)} sep={false} />
          </Card>
          <Card>
            <Sec>Acquisition Costs</Sec>
            <Row l="Transfer duty" v={R(c.td)} />
            <Row l="Conveyancing" v={R(c.cv)} />
            {occupied && <Row l="Eviction/occupier exposure" v={R(c.evictionExposure)} color={C.red} />}
            <Row l="Total" v={R(c.costs + c.evictionExposure)} bold sep={false} />
          </Card>
          {c.gap < -200000 && (
            <Card accent={C.amber}>
              <div style={{ color: C.amber, fontSize: 13, fontWeight: 600, lineHeight: 1.5 }}>
                ⚠️ Large gap. Consider seller-finance acquisition (Installment tab) — your structured offer can bridge this while still protecting your profit.
              </div>
            </Card>
          )}
        </>}

        {/* ═══ TAB 4: INSTALLMENT (Seller Finance Acquisition) ════════════ */}
        {tab === 4 && <>
          <Card accent={C.purple}>
            <Sec>Your Assumptions</Sec>
            <Slider label="Interest rate you'll offer the seller" value={instRate} onChange={set("instRate")} min={0} max={24} />
            <Slider label="Term to pay it off over (years)" value={instYrs} onChange={set("instYrs")} min={5} max={30} suffix=" yrs" />
            <Slider label="Capital growth you expect in this area, per year, next 5 years" value={areaGrowthPct} onChange={set("areaGrowthPct")} min={0} max={15} suffix="%" />
            <Slider label="LTV you'd want to refinance at" value={targetRefiLtv} onChange={set("targetRefiLtv")} min={50} max={80} suffix="%" />
            <Slider label="Extra costs to budget at refinance (bond reg. + legal)" value={refiCostsPct} onChange={set("refiCostsPct")} min={0} max={10} suffix="%" />
            <NumInput label="Settle at a specific month instead? (0 = use earliest safe month)" value={settlementMonth} onChange={set("settlementMonth")} step={1} prefix="" min={0} />
          </Card>

          <Card>
            <Sec>Structured Purchase</Sec>
            <BigOffer label="Max Offer Amount (MOA)" value={R(c.moa)} color={C.blueL} sub="= your Max Cash Offer, financed via the seller instead of paid cash" />
          </Card>

          <Card>
            <Sec>Payment Schedule</Sec>
            <Row l="Monthly payment to seller" v={R(c.iMo)} color={C.blueL} bold />
            <Row l="Total paid over full term" v={R(c.iTotal)} />
            <Row l="Total interest / premium cost" v={R(c.iInterest)} color={instRate > 0 ? C.red : C.green} sep={false} />
          </Card>

          <Card accent={c.iMeetsTarget === false ? C.amber : C.green}>
            <Sec>Earliest Safe Settlement</Sec>
            {c.iEarliestMonth === null ? (
              <div style={{ fontSize: 12.5, color: C.amber, lineHeight: 1.6 }}>
                Balance never reaches your target LTV within {instYrs} years at these settings.
              </div>
            ) : (
              <>
                <Row l="Earliest eligible settlement" v={monthsLabel(c.iEarliestMonth)} color={C.green} bold />
                <Row l="Payoff balance at that month" v={R(c.iEarliestBalance)} color={C.blueL} />
                <Row l="Property value at that month" v={R(c.iEarliestValue)} sep={false} />
              </>
            )}
            {c.iChosenMonth !== null && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
                <Row l="Settlement month" v={monthsLabel(c.iChosenMonth)} bold />
                <Row l="Settlement (payoff) amount" v={R(c.iChosenBalance)} color={C.blueL} bold />
                <Row l="Property value at that month" v={R(c.iChosenValue)} />
                <Row l="LTV at settlement" v={c.iChosenLtv !== null ? pct(c.iChosenLtv) : "—"} color={c.iMeetsTarget ? C.green : C.amber} />
                <Row l="Refi-ready?" v={c.iMeetsTarget ? "Yes" : "No"} color={c.iMeetsTarget ? C.green : C.amber} />
                <Row l="Max exposure ceiling at that value" v={R(c.iRefiExposureCeiling)} sep={false} />
              </div>
            )}
          </Card>

          <Card>
            <Sec>vs. Cash Offer</Sec>
            <Row l="Max cash offer" v={R(c.cash)} />
            <Row l="Structured purchase total" v={R(c.iTotal)} />
            <Row l="Premium for seller financing" v={R(c.iTotal - c.cash)} color={C.amber} sep={false} />
          </Card>
          {bondAmount > 0 && (
            <Card accent={C.purple}>
              <Sec>Bond Takeover</Sec>
              <Row l="Seller's bond monthly" v={R(bondMonthly)} />
              <Row l="Your installment offer" v={R(c.iMo)} color={C.blueL} />
              <Row l="Seller's net monthly receipt" v={R(c.iMo - bondMonthly)} color={c.iMo - bondMonthly >= 0 ? C.green : C.red} bold sep={false} />
            </Card>
          )}
        </>}

        {/* ═══ TAB 5: DISPOSITION ══════════════════════════════════ */}
        {tab === 5 && <>
          <Card>
            <Sec>🏠 Buy to Let — Cash Acquisition</Sec>
            <Row l={`Effective LTR rent (${100 - vacancy}% occupied)`} v={R(c.effRent)} />
            <Row l="Less: levies, rates, maintenance" v={`(${R(c.opex)})`} color={C.red} />
            <Row l="Monthly cashflow" v={R(c.btlFlow)} color={flowColor(c.btlFlow)} bold />
            <Row l="Annual ROI on deployed capital" v={c.btlROI !== null ? pct(c.btlROI) : "—"} sep={false} />
          </Card>

          <Card>
            <Sec>🏠 Buy to Let — Structured Purchase</Sec>
            <Row l="Monthly cashflow (before seller pmnt)" v={R(c.btlFlow)} />
            <Row l="Less: monthly to seller" v={`(${R(c.iMo)})`} color={C.red} />
            <Row l="Net monthly cashflow" v={R(c.btlInstFlow)} color={flowColor(c.btlInstFlow)} bold sep={false} />
            <div style={{ fontSize: 11, color: C.sub, marginTop: 10, lineHeight: 1.5 }}>
              No deposit. Property cashflows while paying the seller.
            </div>
          </Card>

          <Card>
            <Sec>🌙 Short-Term Rental (STR)</Sec>
            <Row l={`Gross STR (${strOccupancy}% @ R${strNightly}/night)`} v={R(c.strMonthly)} />
            <Row l="Less: platform + mgmt (est. 20%)" v={`(${R(c.strMonthly * 0.2)})`} color={C.red} />
            <Row l="Less: operating costs" v={`(${R(c.opex)})`} color={C.red} />
            <Row l="Net STR cashflow / month" v={R(c.strFlow)} color={flowColor(c.strFlow)} bold sep={false} />
          </Card>

          <Card>
            <Sec>As-Is Value — basis for Rent-to-Own & Seller Finance pricing</Sec>
            <div style={{ fontSize: 12, color: C.sub, marginBottom: 14, lineHeight: 1.5 }}>
              Auto-calculated as ARV minus renovation cost. Both exit strategies below price at 120% of this figure.
            </div>
            <Row l="As-is value (ARV − repairs)" v={R(c.asIsAuto)} color={!rtoAsIsOverrideOn ? C.blueL : undefined} bold={!rtoAsIsOverrideOn} />
            <Toggle label="Override as-is value?" value={rtoAsIsOverrideOn} onChange={set("rtoAsIsOverrideOn")} />
            {rtoAsIsOverrideOn && (
              <NumInput label="As-Is Value (override)" value={rtoAsIsOverride} onChange={set("rtoAsIsOverride")} step={10000} min={0} />
            )}
            <Row l="As-is value used" v={R(c.asIsValue)} color={C.blueL} bold sep={false} />
          </Card>

          <Card>
            <Sec>🔑 Rent-to-Own (Lease-Option)</Sec>
            <div style={{ fontSize: 12, color: C.sub, marginBottom: 14, lineHeight: 1.5 }}>
              Price and rent are calculated, not typed: purchase price is 120% of as-is value; monthly rate is the top of your market rent range marked up 10%.
            </div>
            <Row l="Purchase price (120% of as-is)" v={R(c.rtoPrice)} bold />
            <Slider label="Option Term (years)" value={rtoTerm} onChange={set("rtoTerm")} min={1} max={5} suffix=" yrs" />
            <Row l={`Monthly rent-to-own (R${rentalHigh.toLocaleString()} × 110%)`} v={R(c.rtoMonthly)} color={C.green} bold />
            <Row l={`Lease option fee (${c.rtoLofPct}% — ${rtoTerm}yr term)`} v={R(c.rtoOptionFee)} color={C.blueL} sub="Non-refundable, forfeited on default" />
            <Row l="Purchase price if exercised (price − LOF credit)" v={R(c.rtoPriceIfExercised)} sub="Only if buyer completes with no default" />
            <Row l="Less: monthly to seller (if structured)" v={`(${R(c.iMo)})`} color={C.red} />
            <Row l="Net monthly spread" v={R(c.rtoSpread)} color={flowColor(c.rtoSpread)} bold sep={false} />
          </Card>

          <Card>
            <Sec>📄 Seller Finance to End Buyer</Sec>
            <Row l="Sale price (120% of as-is, same basis as Rent-to-Own)" v={R(c.sfp)} bold />
            <Slider label="Deposit from Buyer" value={sfDepositPct} onChange={set("sfDepositPct")} min={0} max={30} suffix="%" />
            <Slider label="Term (years)" value={sfYrs} onChange={set("sfYrs")} min={5} max={30} suffix=" yrs" />
            <InfoRow label="Interest rate (fixed by deposit tier)" value={pct(c.sfRate, 0)} sub="0%→18% · 1–5%→16% · 6–10%→15% · >10%→14%, not adjustable" />
            <Row l="Deposit amount" v={R(c.sfDepositAmt)} color={C.green} />
            <Row l="Loan amount financed" v={R(c.sfLoanAmt)} />
            <Row l="Monthly income from buyer" v={R(c.sfM)} color={C.green} bold />
            <Row l="Less: your monthly to seller (structured acq.)" v={`(${R(c.iMo)})`} color={C.red} />
            <Row l="Net monthly spread" v={R(c.sfSpread)} color={flowColor(c.sfSpread)} bold />
            <Row l="Total received over full term (incl. deposit)" v={R(c.sfTotal)} sep={false} />

            <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
              <NumInput label="Early Settlement Month (0 = not set)" value={sfSettlementMonth} onChange={set("sfSettlementMonth")} step={1} prefix="" min={0} />
              {c.sfChosenMonth !== null && (
                <>
                  <Row l="Settlement month" v={monthsLabel(c.sfChosenMonth)} bold />
                  <Row l="Settlement amount owed by buyer" v={R(c.sfSettleBalance)} color={C.blueL} bold sep={false} />
                </>
              )}
            </div>
          </Card>

          <Card>
            <Sec>🔨 Flip & Sell</Sec>
            <Row l="Sale at ARV" v={R(arv)} />
            <Row l="Less: buy + repairs + acq. costs" v={`(${R(c.cashIn)})`} color={C.red} />
            <Row l={`Less: selling costs (${flipPct}%)`} v={`(${R(c.flipSell)})`} color={C.red} />
            <Row l="Flip profit" v={R(c.flipProfit)} color={scoreColor(c.flipProfit, arv)} bold sep={false} />
          </Card>

          <Card>
            <Sec>🔄 BRRRR</Sec>
            <Slider label="Refinance LTV" value={bLtv} onChange={set("bLtv")} min={10} max={100} />
            <Slider label="New Bond Interest Rate" value={bRate} onChange={set("bRate")} min={5} max={25} step={0.5} />
            <Slider label="Bond Period" value={bBondYears} onChange={set("bBondYears")} min={1} max={30} suffix=" yrs" />
            <Toggle label="Interest only" value={bInterestOnly} onChange={set("bInterestOnly")} />
            <Row l="Refinance amount" v={R(c.refAmt)} />
            <Row l="Total invested (cash acq.)" v={R(c.cashIn)} />
            <Row l="Cash left in deal" v={R(c.cashLeft)} color={c.cashLeft < 50000 ? C.green : C.amber} bold />
            {c.cashOut > 0 && <Row l="Cash pulled out (equity)" v={R(c.cashOut)} color={C.green} />}
            <Row l={`Bond payment / month${bInterestOnly ? " (interest only)" : ""}`} v={R(c.bPmt)} color={C.red} />
            <Row l="Monthly cashflow after bond" v={R(c.brrrrFlow)} color={flowColor(c.brrrrFlow)} bold />
            {c.bCoC !== null && <Row l="Cash-on-cash ROI" v={pct(c.bCoC)} color={flowColor(c.brrrrFlow)} sep={false} />}
          </Card>
        </>}

        {/* ═══ TAB 6: SUMMARY ════════════════════════════════════════ */}
        {tab === 6 && <>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <button
              onClick={() => downloadSummaryPdf(inp, c)}
              style={{ background: C.blue, color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}
            >
              ⬇ Download PDF
            </button>
          </div>

          {(clientName || propAddress) && (
            <Card accent={C.blue}>
              <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{clientName}</div>
              <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>{propAddress}</div>
            </Card>
          )}

          {(showAskingSanityWarning || showGutFeelSanityWarning) && (
            <WarningBanner>
              ⚠️ One or more valuation inputs on this deal are far outside normal range vs. ARV. Double-check them before sharing this summary — see the Inputs tab for details.
            </WarningBanner>
          )}

          <Card>
            <Sec>Deal Snapshot</Sec>
            <Row l="Property type" v={ptConfig.label} />
            <Row l="ARV" v={R(arv)} />
            <Row l="Gut-feel value" v={R(gutFeel)} color={C.dim} />
            <Row l="Municipal valuation" v={munVal > 0 ? R(munVal) : "—"} />
            <Row l="Seller asking" v={R(asking)} />
            {sellerMotivatedPrice > 0 && <Row l="Seller motivated price" v={R(sellerMotivatedPrice)} color={C.amber} />}
            {sellerWalkAwayPrice > 0 && <Row l="Seller walk-away floor" v={R(sellerWalkAwayPrice)} color={C.amber} />}
            <Row l="Max cash offer" v={R(c.cash)} color={C.blueL} bold />
            <Row l="Asking vs offer" v={c.gap >= 0 ? `✅  ${R(c.gap)} buffer` : `⚠️  ${R(Math.abs(c.gap))} short`}
              color={c.gap >= 0 ? C.green : C.amber} />
            {c.totalArrears > 0 && <Row l="Total arrears to clear" v={R(c.totalArrears)} color={C.amber} />}
            {occupied && <Row l="Eviction/occupier exposure" v={R(c.evictionExposure)} color={C.red} />}
            <Row l="Effective offer (after arrears + eviction)" v={R(c.cash - c.totalArrears)} color={C.blueL} bold sep={false} />
          </Card>

          <Card>
            <Sec>Risk Profile</Sec>
            <RiskBadge level={c.riskLevel} />
            <div style={{ marginTop: 10 }}>
              <Row l="Total monthly exposure" v={R(c.totalMonthlyExp)} />
              <Row l="Seller bond outstanding" v={bondAmount > 0 ? R(bondAmount) : "—"} />
              <Row l="Unlawful occupier present" v={occupied ? `Yes — ${OCCUPIER_TYPES.find(o => o.value === occupierType)?.label || occupierType}` : "No"} color={occupied ? C.red : C.green} sep={false} />
            </div>
          </Card>

          <Card>
            <Sec>Exit Strategy Comparison</Sec>
            <ExitRow icon="🔨" label="Flip profit" note="once-off"
              value={R(c.flipProfit)} color={scoreColor(c.flipProfit, arv)} />
            <ExitRow icon="🏠" label="BTL cashflow / mo (cash buy)" note="monthly"
              value={R(c.btlFlow)} color={flowColor(c.btlFlow)} />
            <ExitRow icon="🏠" label="BTL cashflow / mo (structured buy)" note="monthly, no deposit"
              value={R(c.btlInstFlow)} color={flowColor(c.btlInstFlow)} />
            <ExitRow icon="🌙" label="STR net cashflow / mo" note="short-term rental"
              value={R(c.strFlow)} color={flowColor(c.strFlow)} />
            <ExitRow icon="🔑" label="Rent-to-Own spread / mo" note="+ option fee upfront"
              value={R(c.rtoSpread)} color={flowColor(c.rtoSpread)} />
            <ExitRow icon="📄" label="Seller finance to buyer — spread / mo" note="monthly income stream"
              value={R(c.sfSpread)} color={flowColor(c.sfSpread)} />
            <ExitRow icon="🔄" label="BRRRR cashflow / mo" note="after refi bond"
              value={R(c.brrrrFlow)} color={flowColor(c.brrrrFlow)} />
          </Card>

          <Card accent={offerColor}>
            <Sec>Deal Verdict</Sec>
            <div style={{ fontSize: 13, color: C.dim, lineHeight: 1.7 }}>
              {occupied && (
                <div style={{ marginBottom: 10, color: C.red, fontWeight: 600 }}>
                  ⚠️ Unlawful occupier on site — factor a {evictionMonths}-month PIE Act process and {R(c.evictionExposure)} in costs into your timeline before this becomes a clean, sellable/lettable asset.
                </div>
              )}
              {sellerWalkAwayPrice > 0 && (
                <div style={{ marginBottom: 10, color: c.clearsWalkAway ? C.green : C.amber, fontWeight: 600 }}>
                  {c.clearsWalkAway
                    ? `✅ Your MCO already clears the seller's stated walk-away floor of ${R(sellerWalkAwayPrice)} — this should be closeable.`
                    : `⚠️ Your MCO is ${R(Math.abs(c.gapToWalkAway))} short of the seller's stated floor of ${R(sellerWalkAwayPrice)}.${sellerPrefersInstallment ? " They prefer installment terms if it beats a cash offer — check the Installment tab." : ""}`}
                </div>
              )}
              {arv > 0 && c.cashP / arv >= 0.12
                ? `✅ Strong deal at MCO of ${R(c.cash)}. Profit of ${R(c.cashP)} (${pct(c.cashP / arv * 100)} of ARV). Room to negotiate up if needed.`
                : arv > 0 && c.cashP / arv >= 0.06
                ? `⚠️ Marginal at cash. Profit of ${R(c.cashP)} is thin. Consider a structured purchase to give the seller their price over time while protecting your spread.`
                : `🔴 Weak at these numbers. Check if a structured purchase bridges the gap — seller gets full price, you get time to create value.`}
            </div>
          </Card>

          <Card>
            <Sec>Notes</Sec>
            <div style={{ fontSize: 12, color: C.sub, marginBottom: 10, lineHeight: 1.5 }}>
              Anything else worth remembering about this deal — included in the PDF download below.
            </div>
            <textarea
              value={summaryNotes}
              onChange={(e) => set("summaryNotes")(e.target.value)}
              placeholder="e.g. Conditions discussed, next steps, follow-up date…"
              rows={5}
              style={{ width: "100%", background: "#141C2E", border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 13, fontFamily: "inherit", resize: "vertical", outline: "none" }}
            />
          </Card>
        </>}

        </div>
      </div>
    </div>
  );
}
