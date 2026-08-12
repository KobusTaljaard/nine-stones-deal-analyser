// ═══════════════════════════════════════════════════════════════
// Nine Stones — contract fill core
// Ported verbatim from Nine-Stones-Contract-Generator.html so the
// generated PDFs are byte-for-byte equivalent to the standalone tool.
// pdf-lib is passed in (dynamically imported) to keep it out of the
// main bundle until the Documents tab is actually used.
// ═══════════════════════════════════════════════════════════════

export function toNum(v) {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return v;
  const n = parseFloat(String(v).replace(/[^\d.-]/g, ""));
  return isNaN(n) ? null : n;
}

export function rand(v) {
  const n = toNum(v);
  if (n === null) return "";
  const neg = n < 0;
  const w = Math.round(Math.abs(n));
  const s = String(w).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return (neg ? "-R " : "R ") + s;
}

export function plainNum(v) {
  const n = toNum(v);
  if (n === null) return "";
  return String(Math.round(Math.abs(n))).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export function round5000(v) {
  const n = toNum(v);
  return n == null ? null : Math.round(n / 5000) * 5000;
}

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function threeDigits(n) {
  let out = "";
  const h = Math.floor(n / 100);
  const r = n % 100;
  if (h) out += ONES[h] + " Hundred";
  if (r) {
    if (out) out += " and ";
    if (r < 20) out += ONES[r];
    else { out += TENS[Math.floor(r / 10)]; if (r % 10) out += "-" + ONES[r % 10]; }
  }
  return out;
}

export function intToWords(n) {
  n = Math.round(Math.abs(n));
  if (n === 0) return "Zero";
  const scales = ["", " Thousand", " Million", " Billion"];
  const g = [];
  while (n > 0) { g.push(n % 1000); n = Math.floor(n / 1000); }
  const parts = [];
  for (let i = g.length - 1; i >= 0; i--) if (g[i]) parts.push(threeDigits(g[i]) + scales[i]);
  return parts.join(" ");
}

export function randWords(v) {
  const n = toNum(v);
  if (n === null) return "";
  const w = Math.floor(Math.abs(n));
  const c = Math.round((Math.abs(n) - w) * 100);
  let s = intToWords(w) + " Rand";
  if (c) s += " and " + intToWords(c) + " Cent" + (c === 1 ? "" : "s");
  return s;
}

export function pctWords(v) {
  const n = toNum(v);
  if (n === null || v === "") return "";
  return (Math.round(n * 100) / 100) + "% per year";
}

export function monthsWords(v) {
  const n = toNum(v);
  if (n === null) return "";
  const m = Math.round(n);
  const yr = m / 12;
  if (Number.isInteger(yr)) return m + " months (" + yr + " year" + (yr === 1 ? "" : "s") + ")";
  return m + " months";
}

// Addendum B has no AcroForm — values are drawn at fixed coordinates.
export const ADDB_BOXES = [
  { p: 0, x: 330, top: 80.2, size: 9, key: "seller_name_1" },
  { p: 0, x: 50, top: 98.2, size: 9, key: "buyer_name_1" },
  { p: 0, x: 275, top: 98.2, size: 9, key: "property_address" },
  { p: 0, x: 382, top: 116.2, size: 9, key: "dos_date" },
  { p: 0, x: 48, top: 292, size: 9, key: "finance_amount", fmt: "rand" },
  { p: 0, x: 190, top: 292, size: 7.5, key: "finance_words" },
  { p: 0, x: 48, top: 336, size: 9, key: "interest_rate", fmt: "pct" },
  { p: 0, x: 221, top: 336, size: 9, key: "loan_period", fmt: "months" },
  { p: 0, x: 394, top: 336, size: 9, key: "instalment", fmt: "rand" },
  { p: 0, x: 48, top: 380, size: 9, key: "first_instal" },
  { p: 0, x: 221, top: 380, size: 9, key: "balloon_amt", fmt: "rand" },
  { p: 0, x: 394, top: 380, size: 9, key: "balloon_date" },
  { p: 1, x: 50, top: 444, size: 9, key: "sign_place" },
  { p: 1, x: 282, top: 444, size: 9, key: "sign_date" },
  { p: 1, x: 45, top: 546, size: 8, key: "seller_name_1" },
  { p: 1, x: 174, top: 546, size: 8, key: "seller_name_2" },
  { p: 1, x: 304, top: 546, size: 8, key: "buyer_name_1" },
  { p: 1, x: 433, top: 546, size: 8, key: "buyer_name_2" },
];

function fmtValue(fmt, v) {
  if (fmt === "rand") return rand(v);
  if (fmt === "pct") return pctWords(v);
  if (fmt === "months") return monthsWords(v);
  return (v === null || v === undefined) ? "" : String(v);
}

export function derive(d) {
  const o = { ...d };
  const price = toNum(o.price_amount);
  const dep = toNum(o.deposit_amount) || 0;
  const extra = toNum(o.extra_cash) || 0;
  if (o.finance_amount === undefined || o.finance_amount === null || o.finance_amount === "") {
    if (price !== null) o.finance_amount = price - dep - extra;
  }
  o.finance_words = randWords(o.finance_amount);
  o.price_words = randWords(o.price_amount);
  o.deposit_words = randWords(o.deposit_amount);
  if (!toNum(o.balloon_amt)) o.balloon_amt = "";
  return o;
}

async function fillAcroForm(PDFLib, templateBytes, mapping) {
  const pdf = await PDFLib.PDFDocument.load(templateBytes);
  const form = pdf.getForm();
  const FIXED = { special_conditions: 10, property_excluded: 10, special: 10 };
  for (const name in mapping) {
    let val = mapping[name];
    if (val === null || val === undefined) val = "";
    try {
      const f = form.getTextField(name);
      f.setText(String(val));
      try { f.setFontSize(FIXED[name] !== undefined ? FIXED[name] : 0); } catch { /* auto-size */ }
    } catch { /* field not on this template */ }
  }
  try { form.updateFieldAppearances(); } catch { /* ignore */ }
  return await pdf.save();
}

export function deedMapping(d) {
  return {
    seller_name_1: d.seller_name_1, seller_id_1: d.seller_id_1, seller_marital_1: d.seller_marital_1,
    seller_address_1: d.seller_address_1, seller_email_1: d.seller_email_1, seller_cell_1: d.seller_cell_1,
    seller_name_2: d.seller_name_2, seller_id_2: d.seller_id_2, seller_marital_2: d.seller_marital_2,
    seller_address_2: d.seller_address_2, seller_email_2: d.seller_email_2, seller_cell_2: d.seller_cell_2,
    buyer_name_1: d.buyer_name_1, buyer_id_1: d.buyer_id_1, buyer_address_1: d.buyer_address_1,
    buyer_email_1: d.buyer_email_1, buyer_cell_1: d.buyer_cell_1,
    buyer_name_2: d.buyer_name_2, buyer_id_2: d.buyer_id_2, buyer_address_2: d.buyer_address_2,
    buyer_email_2: d.buyer_email_2, buyer_cell_2: d.buyer_cell_2,
    property_address: d.property_address, property_excluded: d.property_excluded,
    price_amount: rand(d.price_amount), price_words: d.price_words,
    deposit_amount: (d.deposit_amount ? rand(d.deposit_amount) : ""),
    deposit_words: (d.deposit_amount ? d.deposit_words : ""),
    attorney_firm: d.attorney_firm, attorney_address: d.attorney_address,
    attorney_phone: d.attorney_phone, attorney_email: d.attorney_email,
    bond_amount: d.bond_amount ? rand(d.bond_amount) : "", bond_days: d.bond_days,
    transfer_date: d.transfer_date, occupation_date: d.occupation_date,
    occupation_rent: d.occupation_rent ? rand(d.occupation_rent) : "",
    special_conditions: d.special_conditions, inspection_days: d.inspection_days,
    offer_expiry: d.offer_expiry,
  };
}

export function addAMapping(d) {
  return {
    seller_name: d.seller_name_1, buyer_name: d.buyer_name_1, property_desc: d.property_address,
    dos_date: d.dos_date, loan_amount: rand(d.finance_amount), amount_words: d.finance_words,
    interest_rate: pctWords(d.interest_rate), loan_period: monthsWords(d.loan_period),
    instalment: rand(d.instalment), first_instal: d.first_instal,
    balloon_amt: d.balloon_amt ? rand(d.balloon_amt) : "", balloon_date: d.balloon_date,
  };
}

export async function fillDeed(PDFLib, bytes, deal) {
  return fillAcroForm(PDFLib, bytes, deedMapping(derive(deal)));
}
export async function fillAddA(PDFLib, bytes, deal) {
  return fillAcroForm(PDFLib, bytes, addAMapping(derive(deal)));
}
export async function fillAddB(PDFLib, bytes, dealRaw) {
  const d = derive(dealRaw);
  const pdf = await PDFLib.PDFDocument.load(bytes);
  const font = await pdf.embedFont(PDFLib.StandardFonts.Helvetica);
  const pages = pdf.getPages();
  for (const b of ADDB_BOXES) {
    const raw = d[b.key];
    const txt = b.fmt ? fmtValue(b.fmt, raw) : (raw === null || raw === undefined ? "" : String(raw));
    if (!txt) continue;
    const page = pages[b.p];
    const h = page.getHeight();
    page.drawText(txt, { x: b.x, y: h - b.top, size: b.size, font, color: PDFLib.rgb(0.03, 0.13, 0.28) });
  }
  return await pdf.save();
}

// ── Shared filename rule ──────────────────────────────────────
// DEAL SUMMARIZER-{Seller} - {street}, {suburb}.pdf
// OTP-{Seller} - {street}, {suburb} - {Document}.pdf
export function dealFilename(prefix, sellerName, streetNo, streetName, townOrSuburb) {
  const street = [streetNo, streetName].filter(Boolean).join(" ");
  const core = [sellerName, [street, townOrSuburb].filter(Boolean).join(", ")]
    .filter(Boolean).join(" - ");
  return `${prefix}-${core}`.replace(/[\\/:*?"<>|]/g, "").trim();
}

export function sanitise(s) {
  return String(s || "").replace(/[\\/:*?"<>|]/g, "").trim();
}
