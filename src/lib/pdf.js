import { jsPDF } from "jspdf";
import { propertyTypeConfig, OCCUPIER_TYPES } from "./calc.js";

function money(n) {
  if (n === null || n === undefined || !isFinite(n) || isNaN(n)) return "-";
  const abs = Math.round(Math.abs(n)).toLocaleString("en-US");
  return (n < 0 ? "-R " : "R ") + abs;
}
function pctFmt(n, d = 1) {
  if (n === null || n === undefined || !isFinite(n) || isNaN(n)) return "-";
  return n.toFixed(d) + "%";
}

const INK = [20, 26, 41];
const SUB = [100, 110, 130];
const LINE = [222, 226, 235];
const BLUE = [37, 99, 235];
const GREEN = [16, 150, 90];
const AMBER = [180, 120, 10];
const RED = [200, 45, 45];

export function downloadSummaryPdf(inp, c) {
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const pageW = 210;
  const marginX = 14;
  const colGap = 8;
  const colW = (pageW - marginX * 2 - colGap) / 2;
  let y = 14;

  const ptConfig = propertyTypeConfig(inp.propertyType);
  const occLabel = OCCUPIER_TYPES.find((o) => o.value === inp.occupierType)?.label || inp.occupierType;

  function heading() {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(...INK);
    doc.text("Nine Stones Capital", marginX, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...SUB);
    doc.text("Deal Summary Report", marginX, y + 5);
    doc.setFontSize(8);
    const dateStr = new Date().toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" });
    doc.text(`Generated ${dateStr}`, pageW - marginX, y, { align: "right" });
    y += 9;
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.3);
    doc.line(marginX, y, pageW - marginX, y);
    y += 6;
  }

  function clientLine() {
    if (!inp.clientName && !inp.propAddress) return;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...INK);
    doc.text(inp.clientName || "Unnamed client", marginX, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...SUB);
    doc.text(inp.propAddress || "", marginX, y + 4.3);
    y += 10;
  }

  function sectionTitle(title) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...BLUE);
    doc.text(title.toUpperCase(), marginX, y);
    y += 4.5;
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.2);
    doc.line(marginX, y - 1.5, pageW - marginX, y - 1.5);
  }

  function twoColRows(rows, rowH = 4.6) {
    const startY = y;
    const perCol = Math.ceil(rows.length / 2);
    rows.forEach((row, i) => {
      const col = i < perCol ? 0 : 1;
      const idx = col === 0 ? i : i - perCol;
      const rx = marginX + col * (colW + colGap);
      const ry = startY + idx * rowH;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.3);
      doc.setTextColor(...SUB);
      doc.text(row.l, rx, ry);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...(row.color || INK));
      doc.text(row.v, rx + colW, ry, { align: "right" });
    });
    y = startY + perCol * rowH + 4;
  }

  function singleColRows(rows, rowH = 4.6) {
    rows.forEach((row) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.3);
      doc.setTextColor(...SUB);
      doc.text(row.l, marginX, y);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...(row.color || INK));
      doc.text(row.v, pageW - marginX, y, { align: "right" });
      y += rowH;
    });
    y += 2;
  }

  function paragraph(text, color = INK) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.4);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, pageW - marginX * 2);
    doc.text(lines, marginX, y);
    y += lines.length * 4 + 3;
  }

  heading();
  clientLine();

  sectionTitle("Deal Snapshot");
  const snapRows = [
    { l: "Property type", v: ptConfig.label },
    { l: "ARV", v: money(inp.arv) },
    { l: "Seller asking", v: money(inp.asking) },
    { l: "Max cash offer", v: money(c.cash), color: BLUE },
    { l: "Effective offer (after arrears+eviction)", v: money(c.cash - c.totalArrears), color: BLUE },
    { l: "Gap vs asking", v: (c.gap >= 0 ? "+" : "") + money(c.gap), color: c.gap >= 0 ? GREEN : AMBER },
  ];
  if (inp.sellerMotivatedPrice > 0) snapRows.push({ l: "Seller motivated price", v: money(inp.sellerMotivatedPrice), color: AMBER });
  if (inp.sellerWalkAwayPrice > 0) snapRows.push({ l: "Seller walk-away floor", v: money(inp.sellerWalkAwayPrice), color: AMBER });
  twoColRows(snapRows);

  sectionTitle("Risk Profile");
  singleColRows([
    { l: "Risk level", v: c.riskLevel.toUpperCase(), color: c.riskLevel === "high" ? RED : c.riskLevel === "medium" ? AMBER : GREEN },
    { l: "Total monthly exposure (rates+levy+water)", v: money(c.totalMonthlyExp) + " / mo" },
    { l: "Total arrears to clear", v: money(c.totalArrears) },
    { l: "Occupier present", v: inp.occupied ? `Yes - ${occLabel}` : "No", color: inp.occupied ? RED : GREEN },
  ], 4.4);

  if (c.moa > 0) {
    sectionTitle("Structured Purchase — Early Settlement");
    const rows = [
      { l: "Monthly payment to seller", v: money(c.iMo) + " / mo" },
      { l: "Earliest safe settlement", v: c.iEarliestMonth !== null ? `Month ${Math.round(c.iEarliestMonth)} (~${(c.iEarliestMonth / 12).toFixed(1)} yrs)` : "Beyond term" },
    ];
    if (c.iChosenMonth !== null) {
      rows.push({ l: "Settlement payoff amount", v: money(c.iChosenBalance), color: BLUE });
      rows.push({ l: "Refi-ready at that month", v: c.iMeetsTarget ? "Yes" : "No", color: c.iMeetsTarget ? GREEN : AMBER });
    }
    singleColRows(rows, 4.4);
  }

  sectionTitle("Exit Strategy Comparison");
  twoColRows([
    { l: "Flip profit (once-off)", v: money(c.flipProfit) },
    { l: "BTL cashflow / mo (cash buy)", v: money(c.btlFlow) },
    { l: "BTL cashflow / mo (structured)", v: money(c.btlInstFlow) },
    { l: "STR net cashflow / mo", v: money(c.strFlow) },
    { l: "Rent-to-own spread / mo", v: money(c.rtoSpread) },
    { l: "Seller finance spread / mo", v: money(c.sfSpread) },
    { l: "BRRRR cashflow / mo (after refi)", v: money(c.brrrrFlow) },
  ]);

  sectionTitle("Deal Verdict");
  const arv = inp.arv;
  let verdict;
  if (arv > 0 && c.cashP / arv >= 0.12) {
    verdict = `Strong deal at a max cash offer of ${money(c.cash)}. Profit of ${money(c.cashP)} (${pctFmt((c.cashP / arv) * 100)} of ARV).`;
  } else if (arv > 0 && c.cashP / arv >= 0.06) {
    verdict = `Marginal at cash. Profit of ${money(c.cashP)} is thin — consider a structured purchase to give the seller their price over time while protecting your spread.`;
  } else {
    verdict = `Weak at these numbers. Check if a structured purchase bridges the gap.`;
  }
  if (inp.occupied) {
    verdict += ` Occupier on site: factor a ${inp.evictionMonths}-month PIE Act process and ${money(c.evictionExposure)} in costs.`;
  }
  if (inp.sellerWalkAwayPrice > 0) {
    verdict += c.clearsWalkAway
      ? ` Your MCO already clears the seller's stated walk-away floor of ${money(inp.sellerWalkAwayPrice)}.`
      : ` Your MCO is ${money(Math.abs(c.gapToWalkAway))} short of the seller's stated floor of ${money(inp.sellerWalkAwayPrice)}.`;
  }
  paragraph(verdict);

  if (inp.summaryNotes && inp.summaryNotes.trim()) {
    sectionTitle("Notes");
    const MAX_NOTES_CHARS = 600;
    let notesText = inp.summaryNotes.trim();
    if (notesText.length > MAX_NOTES_CHARS) notesText = notesText.slice(0, MAX_NOTES_CHARS).trim() + "…";
    paragraph(notesText, SUB);
  }

  doc.setDrawColor(...LINE);
  doc.line(marginX, y, pageW - marginX, y);
  y += 4;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor(...SUB);
  doc.text("Figures are estimates only. Verify transfer duty, conveyancing, arrears and eviction costs before committing capital.", marginX, y);

  const fileClient = (inp.clientName || "deal").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  doc.save(`${fileClient}-summary.pdf`);
}
