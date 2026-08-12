// ═══════════════════════════════════════════════════════════════
// Nine Stones — OTP document field model
// Ported from the standalone generator. Field keys are STABLE:
// Hermes and any external agent addresses fields by these keys.
// ═══════════════════════════════════════════════════════════════

export const DOC_SECTIONS = [
  {
    id: "property", n: "01", title: "Property", fields: [
      ["ls_sectional", "Sectional title?", "select"],
      ["ls_unit_no", "Unit number", "text"],
      ["ls_section_no", "Section number", "text"],
      ["ls_ss_name", "Scheme name", "text"],
      ["ls_ss_no", "SS / scheme number", "text"],
      ["ls_erf", "Erf / stand number", "text"],
      ["ls_street_no", "Street number", "text"],
      ["ls_street_name", "Street name", "text"],
      ["ls_suburb", "Suburb", "text"],
      ["ls_city", "City / town", "text"],
      ["ls_municipality", "Municipality", "text"],
      ["property_address", "Full property address (composed — editable)", "textarea", { req: ["deed", "A", "B"] }],
      ["property_excluded", "Fixtures excluded, if any", "text"],
    ],
  },
  {
    id: "sellers", n: "02", title: "Sellers", fields: [
      ["seller_name_1", "Seller full name & surname", "text", { req: ["deed", "A", "B"] }],
      ["seller_id_1", "Seller ID number", "text", { req: ["deed"] }],
      ["seller_marital_1", "Seller marital status", "text", { req: ["deed"] }],
      ["seller_address_1", "Seller address", "text"],
      ["seller_cell_1", "Seller cellphone", "text"],
      ["seller_email_1", "Seller email", "text"],
      ["seller_name_2", "Second seller — name (optional)", "text"],
      ["seller_id_2", "Second seller — ID (optional)", "text"],
      ["seller_marital_2", "Second seller — marital (optional)", "text"],
    ],
  },
  {
    id: "buyers", n: "03", title: "Buyer — Nine Stones", fields: [
      ["buyer_name_1", "Buyer full name", "text", { req: ["deed", "A", "B"] }],
      ["buyer_id_1", "Buyer registration no.", "text", { req: ["deed"] }],
      ["buyer_address_1", "Buyer address", "text", { req: ["deed"] }],
      ["buyer_email_1", "Buyer email", "text"],
      ["buyer_cell_1", "Buyer cellphone", "text"],
      ["buyer_tax", "Buyer tax number", "text"],
    ],
  },
  {
    id: "attorney", n: "04", title: "Conveyancing Attorney", fields: [
      ["attorney_firm", "Attorney firm & person", "text", { req: ["deed"] }],
      ["attorney_phone", "Attorney phone", "text"],
      ["attorney_email", "Attorney email", "text"],
      ["attorney_address", "Attorney address", "text"],
    ],
  },
  {
    id: "numbers", n: "05", title: "Numbers — from the calculator", fields: [
      ["price_amount", "Purchase / offer price (R) — rounds to R5 000", "text", { req: ["deed", "A", "B"] }],
      ["deposit_amount", "Deposit (R) — rounds to R5 000", "text"],
      ["finance_amount", "Balance (R) — auto = price − deposit", "text", { ro: 1 }],
      ["interest_rate", "Interest rate (% per year)", "text", { req: ["A", "B"] }],
      ["loan_period", "Repayment period (months)", "text", { req: ["A", "B"] }],
      ["instalment", "Monthly instalment (R)", "text", { req: ["A", "B"] }],
      ["balloon_amt", "Balloon / final amount (R)", "text"],
      ["balloon_date", "Balloon amount due (date)", "text"],
    ],
  },
  {
    id: "dates", n: "06", title: "Dates & Terms", fields: [
      ["dos_date", "Deed of Sale signed on (date)", "text", { req: ["A", "B"] }],
      ["transfer_date", "Transfer date", "text", { req: ["deed"] }],
      ["occupation_date", "Occupation date", "text", { req: ["deed"] }],
      ["occupation_rent", "Occupational rent (R / month)", "text"],
      ["offer_expiry", "Offer valid until (default +5 days)", "text"],
      ["bond_amount", "Bond amount (R) — blank for cash", "text"],
      ["bond_days", "Bond granted within", "text"],
      ["inspection_days", "Inspection period", "text"],
      ["first_instal", "First instalment due (date)", "text"],
      ["sign_place", "Signed at (place)", "text"],
      ["sign_date", "Signed on (date)", "text"],
      ["special_conditions", "Special conditions", "textarea"],
    ],
  },
];

export const DOC_ALL = [].concat(...DOC_SECTIONS.map((s) => s.fields));
export const DOC_FIELD = {};
DOC_ALL.forEach((f) => {
  DOC_FIELD[f[0]] = { k: f[0], label: f[1], type: f[2], req: (f[3] && f[3].req) || [], ro: f[3] && f[3].ro };
});
export const DOC_KEYS = DOC_ALL.map((f) => f[0]);

// Nine Stones' own details — seeded on every new deal.
export const DOC_SEED = {
  buyer_name_1: "Nine Stones Capital (Pty) Ltd",
  buyer_id_1: "2012/084151/07",
  buyer_email_1: "kobus@webuysahomes.co.za",
  buyer_cell_1: "083 232 7597",
  buyer_address_1: "13 Mont Blanc Street, Somerset West, 7130",
  buyer_tax: "9341489178",
  attorney_firm: "STBB — Lauren Sullivan",
  attorney_phone: "021 521 4000",
  attorney_email: "laurensu@stbb.co.za",
  bond_days: "14 business days",
  inspection_days: "21 business days",
  ls_sectional: "No",
};

export const DOC_TYPES = [
  { key: "deed", label: "Deed of Sale", file: "deed.pdf" },
  { key: "A", label: "Addendum A Seller Finance", file: "addA.pdf" },
  { key: "B", label: "Addendum B Installment Sale", file: "addB.pdf" },
];

// Legal address string — sectional vs freehold wording handled here.
export function composeAddress(d) {
  const g = (k) => (d[k] || "").toString().trim();
  const sec = g("ls_sectional").toLowerCase().startsWith("y");
  if (sec) {
    const bits = [];
    if (g("ls_unit_no")) bits.push("Unit " + g("ls_unit_no"));
    if (g("ls_section_no")) bits.push("(Section " + g("ls_section_no") + ")");
    let scheme = "";
    if (g("ls_ss_name")) scheme += "in the scheme " + g("ls_ss_name");
    if (g("ls_ss_no")) scheme += (scheme ? " " : "in scheme ") + "No. " + g("ls_ss_no");
    let head = bits.join(" ");
    if (scheme) head += (head ? " " : "") + scheme;
    const street = [g("ls_street_no"), g("ls_street_name")].filter(Boolean).join(" ");
    const tail = [street, g("ls_suburb"), g("ls_city"), g("ls_municipality")].filter(Boolean).join(", ");
    return [head, tail ? "situated at " + tail : ""].filter(Boolean).join(", ");
  }
  const head = g("ls_erf") ? "Erf " + g("ls_erf") : "";
  const street = [g("ls_street_no"), g("ls_street_name")].filter(Boolean).join(" ");
  const tail = [street, g("ls_suburb"), g("ls_city"), g("ls_municipality")].filter(Boolean).join(", ");
  return [head, tail].filter(Boolean).join(", ");
}

// STOP manifest — what an agent reads before generating.
export function validateDocs(doc, selected) {
  const need = DOC_ALL
    .filter((f) => ((f[3] && f[3].req) || []).some((x) => selected.indexOf(x) >= 0))
    .map((f) => f[0]);
  const missing = [];
  need.forEach((k) => {
    const v = (doc[k] === null || doc[k] === undefined) ? "" : String(doc[k]).trim();
    if (!v) missing.push({ field: k, label: DOC_FIELD[k].label });
  });
  return {
    ok: missing.length === 0,
    documents: selected,
    missing,
    timestamp: new Date().toISOString(),
  };
}

export function todayPlus(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// Seed a fresh doc payload, pulling everything the analyser already knows.
export function seedDocFromDeal(inp, c) {
  const isIsa = inp.preferredMethod === "isa";
  const price = isIsa ? c.isaMao : c.cash;
  const seed = {
    ...DOC_SEED,
    seller_name_1: inp.clientName || "",
    seller_cell_1: inp.sellerPhone || "",
    seller_email_1: inp.sellerEmail || "",
    property_address: inp.propAddress || "",
    ls_sectional: inp.propertyType === "sectional_title" ? "Yes" : "No",
    price_amount: price ? Math.round(price / 5000) * 5000 : "",
    offer_expiry: todayPlus(5),
  };
  if (isIsa) {
    seed.interest_rate = String(inp.instRate ?? "");
    seed.loan_period = String((inp.instYrs || 0) * 12);
    seed.instalment = c.isaMonthlyToSeller ? String(Math.round(c.isaMonthlyToSeller)) : "";
  }
  return seed;
}
