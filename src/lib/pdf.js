import { jsPDF } from "jspdf";
import { propertyTypeConfig, OCCUPIER_TYPES, methodLabel } from "./calc.js";
import { dealFilename } from "./contractFill.js";

// jsPDF's built-in fonts use WinAnsi encoding — no typographic minus, no
// en-dashes. Plain hyphens only, so every glyph renders.
function money(n) {
  if (n === null || n === undefined || !isFinite(n) || isNaN(n)) return "-";
  const abs = Math.round(Math.abs(n)).toLocaleString("en-US");
  return (n < 0 ? "-R " : "R ") + abs;
}
function pctFmt(n, d = 1) {
  if (n === null || n === undefined || !isFinite(n) || isNaN(n)) return "-";
  return n.toFixed(d) + "%";
}

const NAVY  = [0, 33, 71];
const GOLD  = [176, 134, 66];
const SUB   = [107, 122, 137];
const LINE  = [230, 222, 210];
const POS   = [14, 130, 80];
const WARN  = [190, 110, 20];
const NEG   = [200, 50, 50];

export function downloadSummaryPdf(inp, c) {
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const pageW = 210, marginX = 14, colGap = 8;
  const colW = (pageW - marginX * 2 - colGap) / 2;
  let y = 14;

  const ptConfig = propertyTypeConfig(inp.propertyType);
  const occLabel = OCCUPIER_TYPES.find((o) => o.value === inp.occupierType)?.label || inp.occupierType;

  function heading() {
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, pageW, 22, "F");
    doc.setFillColor(...GOLD);
    doc.rect(0, 22, pageW, 1.4, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.setTextColor(255, 255, 255);
    doc.text("Nine Stones Capital", marginX, 11);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(200, 190, 176);
    doc.text("Deal Summary Report", marginX, 16.5);
    const dateStr = new Date().toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" });
    doc.text(`Generated ${dateStr}`, pageW - marginX, 11, { align: "right" });
    if (inp.approved) {
      doc.setFont("helvetica", "bold"); doc.setFontSize(8);
      doc.setTextColor(150, 210, 175);
      doc.text("APPROVED", pageW - marginX, 16.5, { align: "right" });
    }
    y = 30;
  }

  function clientLine() {
    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...NAVY);
    doc.text(inp.clientName || "Unnamed lead", marginX, y);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(...SUB);
    doc.text(inp.propAddress || "", marginX, y + 4.4);
    const contact = [inp.sellerPhone, inp.sellerEmail].filter(Boolean).join("   ");
    if (contact) doc.text(contact, pageW - marginX, y + 4.4, { align: "right" });
    y += 11;
  }

  function sectionTitle(t) {
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...GOLD);
    doc.text(t.toUpperCase(), marginX, y);
    y += 3.6;
    doc.setDrawColor(...LINE); doc.setLineWidth(0.25);
    doc.line(marginX, y, pageW - marginX, y);
    y += 4;
  }

  function twoCol(rows, rowH = 4.5) {
    const startY = y, perCol = Math.ceil(rows.length / 2);
    rows.forEach((row, i) => {
      const col = i < perCol ? 0 : 1;
      const idx = col === 0 ? i : i - perCol;
      const rx = marginX + col * (colW + colGap);
      const ry = startY + idx * rowH;
      doc.setFont("helvetica", "normal"); doc.setFontSize(8.1); doc.setTextColor(...SUB);
      doc.text(row.l, rx, ry);
      doc.setFont("helvetica", "bold"); doc.setTextColor(...(row.color || NAVY));
      doc.text(row.v, rx + colW, ry, { align: "right" });
    });
    y = startY + perCol * rowH + 3.5;
  }

  function oneCol(rows, rowH = 4.4) {
    rows.forEach((row) => {
      doc.setFont("helvetica", "normal"); doc.setFontSize(8.1); doc.setTextColor(...SUB);
      doc.text(row.l, marginX, y);
      doc.setFont("helvetica", "bold"); doc.setTextColor(...(row.color || NAVY));
      doc.text(row.v, pageW - marginX, y, { align: "right" });
      y += rowH;
    });
    y += 2;
  }

  function para(text, color = NAVY) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.2); doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, pageW - marginX * 2);
    doc.text(lines, marginX, y);
    y += lines.length * 3.9 + 3;
  }

  // ── Build ─────────────────────────────────────────────────────
  heading();
  clientLine();

  // Headline MAO band
  doc.setFillColor(248, 244, 236);
  doc.setDrawColor(...LINE);
  doc.roundedRect(marginX, y - 3, pageW - marginX * 2, 17, 2, 2, "FD");
  doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(...SUB);
  doc.text(`MAX OFFER - ${methodLabel(inp.preferredMethod).toUpperCase()}`, marginX + 5, y + 2.5);
  doc.setFont("helvetica", "bold"); doc.setFontSize(17); doc.setTextColor(...NAVY);
  doc.text(money(c.headlineMao), marginX + 5, y + 10);
  doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(...SUB);
  doc.text("SELLER ASKING", pageW - marginX - 5, y + 2.5, { align: "right" });
  doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(...SUB);
  doc.text(money(inp.asking), pageW - marginX - 5, y + 9.5, { align: "right" });
  y += 21;

  sectionTitle("Deal Snapshot");
  const snap = [
    { l: "Property type", v: ptConfig.label },
    { l: "ARV", v: money(inp.arv) },
    { l: "Owner's value", v: money(inp.gutFeel) },
    { l: "Estimated repairs", v: money(inp.repairs) },
    { l: "Max cash offer", v: money(c.cash), color: NAVY },
    { l: "Profit at cash MCO", v: money(c.cashP), color: c.cashP / (inp.arv || 1) >= 0.12 ? POS : WARN },
  ];
  if (inp.sellerMotivatedPrice > 0) snap.push({ l: "Seller motivated price", v: money(inp.sellerMotivatedPrice), color: WARN });
  if (inp.sellerWalkAwayPrice > 0) snap.push({ l: "Seller walk-away floor", v: money(inp.sellerWalkAwayPrice), color: WARN });
  twoCol(snap);

  sectionTitle("Installment Sale (ISA) - priced from cash flow");
  oneCol([
    { l: "Net operating income", v: money(c.isaNoi) + " / mo" },
    { l: "Required cash flow", v: money(inp.minCashflow) + " / mo" },
    { l: "Available for the seller's note", v: money(Math.max(0, c.isaSellerPmt)) + " / mo" },
    {
      l: `Binding constraint: ${c.isaBinding === "cashflow" ? "cash flow" : "value ceiling"}`,
      v: c.isaViable ? money(c.isaMao) : "Not viable",
      color: c.isaViable ? NAVY : NEG,
    },
    { l: "Monthly to seller", v: money(c.isaMonthlyToSeller) + " / mo" },
    { l: "Resulting cash flow", v: money(c.isaActualCashflow) + " / mo", color: c.isaActualCashflow >= (inp.minCashflow || 0) ? POS : NEG },
    { l: "DSCR", v: c.isaDscr ? c.isaDscr.toFixed(2) + "x" : "-", color: c.isaDscr >= 1.25 ? POS : WARN },
    {
      l: "Earliest safe settlement",
      v: c.isaEarliestMonth !== null ? `Month ${Math.round(c.isaEarliestMonth)} (~${(c.isaEarliestMonth / 12).toFixed(1)} yrs)` : "Beyond term",
    },
  ]);

  sectionTitle("Risk Profile");
  oneCol([
    { l: "Risk level", v: c.riskLevel.toUpperCase(), color: c.riskLevel === "high" ? NEG : c.riskLevel === "medium" ? WARN : POS },
    { l: "Total monthly exposure", v: money(c.totalMonthlyExp) + " / mo" },
    { l: "Total arrears to clear", v: money(c.totalArrears) },
    { l: "Occupier present", v: inp.occupied ? `Yes - ${occLabel}` : "No", color: inp.occupied ? NEG : POS },
  ]);

  sectionTitle("Exit Strategy Comparison");
  twoCol([
    { l: "Flip profit (once-off)", v: money(c.flipProfit) },
    { l: "BTL cash flow (cash buy)", v: money(c.btlFlow) },
    { l: "BTL cash flow (installment)", v: money(c.btlInstFlow) },
    { l: "STR net cash flow", v: money(c.strFlow) },
    { l: "Rent-to-own spread", v: money(c.rtoSpread) },
    { l: "Seller finance spread", v: money(c.sfSpread) },
    { l: "BRRRR after refinance", v: money(c.brrrrFlow) },
    { l: "Upfront cash for ISA", v: money(c.isaUpfront) },
  ]);

  sectionTitle("Verdict");
  const arv = inp.arv;
  let verdict;
  if (arv > 0 && c.cashP / arv >= 0.12) {
    verdict = `Strong at a cash offer of ${money(c.cash)}. Profit of ${money(c.cashP)} (${pctFmt((c.cashP / arv) * 100)} of ARV).`;
  } else if (arv > 0 && c.cashP / arv >= 0.06) {
    verdict = `Marginal on cash. Profit of ${money(c.cashP)} is thin - the installment structure gives the seller their price over time while protecting the spread.`;
  } else {
    verdict = "Weak on cash at these numbers. The installment route is where this deal lives, if anywhere.";
  }
  if (inp.occupied) {
    verdict += ` Occupier on site: budget a ${inp.evictionMonths}-month PIE Act process and ${money(c.evictionExposure)} in costs, excluded from the ISA price.`;
  }
  if (inp.sellerWalkAwayPrice > 0) {
    verdict += c.clearsWalkAway
      ? ` The offer clears the seller's stated floor of ${money(inp.sellerWalkAwayPrice)}.`
      : ` The offer is ${money(Math.abs(c.gapToWalkAway))} short of the seller's stated floor.`;
  }
  para(verdict);

  if (inp.summaryNotes && inp.summaryNotes.trim()) {
    sectionTitle("Notes");
    const MAX = 520;
    let t = inp.summaryNotes.trim();
    if (t.length > MAX) t = t.slice(0, MAX).trim() + "...";
    para(t, SUB);
  }

  doc.setDrawColor(...LINE);
  doc.line(marginX, y, pageW - marginX, y);
  y += 4;
  doc.setFont("helvetica", "italic"); doc.setFontSize(6.8); doc.setTextColor(...SUB);
  doc.text(
    "Estimates only. Verify transfer duty, conveyancing, arrears, rental and eviction costs before committing capital.",
    marginX, y
  );

  // Shares its naming core with the OTP documents:
  //   DEAL SUMMARIZER-{Seller} - {street}, {suburb}.pdf
  //   OTP-{Seller} - {street}, {suburb} - {Document}.pdf
  const d = inp.doc || {};
  const name = dealFilename(
    "DEAL SUMMARIZER",
    d.seller_name_1 || inp.clientName || "deal",
    d.ls_street_no, d.ls_street_name,
    d.ls_suburb || d.ls_city || ""
  );
  doc.save(`${name}.pdf`);
}
