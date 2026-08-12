# Nine Stones Deal Analyser — Integration Guide for Hermes

Everything an agent needs to drive the calculator and the document generator. Written for Hermes; also the reference for anyone editing the app.

**Live:** https://nine-stones-deal-analyser.vercel.app
**Repo:** https://github.com/KobusTaljaard/nine-stones-deal-analyser
**Source of truth on disk:** `~/Library/Mobile Documents/com~apple~CloudDocs/Business personal/Real Estate/Deal Analyser`

---

## 1. What this app is

A single React (Vite) app on Vercel, backed by Supabase. Two jobs in one place:

1. **Deal Analyser** — works out what Nine Stones can pay, cash or installment.
2. **Document Generator** — fills the three OTP contracts from those numbers.

They were separate tools. They are now one app, so the generator reads the deal directly instead of asking for a database key.

### Tabs

| # | Tab | Purpose |
|---|---|---|
| 0 | Inputs | Seller contact, property, valuation, rent, costs, preferred method |
| 1 | Due Diligence | Risk, occupancy, bond, municipal, exposure |
| 2 | Negotiation | Seller price signals + conversation log |
| 3 | Cash Offer | Max cash offer build-up |
| 4 | Installment | ISA offer priced from cash flow |
| 5 | Disposition | Exit strategies (BTL, STR, RTO, seller finance, flip, BRRRR) |
| 6 | Summary | One-page overview, PDF export, **approve gate** |
| 7 | Documents | OTP generation |

---

## 2. Data model

### Supabase — table `deals`

| Column | Notes |
|---|---|
| `id` | uuid |
| `client_name` | mirrored from `inputs.clientName` |
| `property_address` | mirrored from `inputs.propAddress` |
| `inputs` | **jsonb — everything else lives here** |
| `status` | `active` / `archived` |
| `updated_at` | |

Project ref: `dsmxjaxchdqscpqqydnw`

Everything is inside `inputs`, so **no migration is ever needed to add a field**. Write the whole `inputs` object back; the app merges it over `defaultInputs()` on load, so older rows pick up new fields automatically.

### Key fields inside `inputs`

**Identity & routing**
`clientName`, `propAddress`, `sellerPhone`, `sellerEmail`, `preferredMethod` (`"cash"` | `"isa"`), `approved` (bool), `approvedAt` (ISO).

**Valuation** — `arv`, `arvPct`, `repairs`, `asking`, `gutFeel`, `rental`, `rentalHigh`, `munVal`, `listedPrice`, `daysOnMarket`.

**Costs** — `vacancy`, `levies`, `maint`, `insuranceMonthly`, `ratesMonthly`, `waterMonthly`, `tenantPaysWater`, `elecPrepaid`, `elecAvg3mo`.

**ISA** — `minCashflow` (default 1500), `takeOverBond`, `isaMaxPctOfArv` (default 100), `instRate`, `instYrs`, `areaGrowthPct`, `targetRefiLtv`, `refiCostsPct`, `settlementMonth`.

**Bond** — `bondAmount`, `bondArrears`, `bondMonthly`, `bondRate`, `bondEndYear`.

**Occupancy** — `occupied`, `occupierType`, `evictionMonths`, `evictionLegalCost`, `evictionHoldingMonthly`.

**Documents** — `inputs.doc` — an object of OTP field keys (section 5).

`negotiationLog` is an array of `{id, timestamp, text, voiceNoteUrl}`.

---

## 3. How the ISA offer is calculated

This is the important one. **The price is derived from the payment, not the other way round.**

```
effective rent            = rental × (1 − vacancy%)
landlord costs            = levies + maintenance + rates + insurance
                            + water (if tenant doesn't pay) + electricity (if not prepaid)
net operating income      = effective rent − landlord costs
budget                    = NOI − minCashflow
seller payment available  = budget − existing bond instalment (if taking it over)

cash-flow ceiling         = PV(seller payment, instRate, instYrs) + bond balance assumed
value ceiling             = ARV × isaMaxPctOfArv% − repairs

ISA MAO                   = min(cash-flow ceiling, value ceiling)
```

Two rules that matter:

- **The lower ceiling always wins.** Long, cheap terms will otherwise justify a price above what the property is worth. `computed.isaBinding` tells you which one bound: `"cashflow"` or `"value"`.
- **Eviction cost is deliberately excluded** from the ISA price. It is a warning only. It *is* deducted from the cash offer.

If `isaViable` is false, the rent cannot carry the minimum cash flow and there is no installment deal at these inputs.

---

## 4. Driving the app from the browser — `window.NSC`

Available on any deal page. Populated by the calculator; extended by the Documents tab when that tab is open.

### Always available

| Call | Returns / does |
|---|---|
| `NSC.dealId` | current deal uuid |
| `NSC.inputs` | the full inputs object |
| `NSC.computed` | everything `computeDeal()` produces |
| `NSC.setInput(key, value)` | set one input (autosaves ~900ms later) |
| `NSC.setInputs({...})` | set many at once |
| `NSC.goToTab(n)` | switch tab — **`NSC.goToTab(7)` for Documents** |
| `NSC.tabs` | tab names in order |

### Available while the Documents tab is open

| Call | Returns / does |
|---|---|
| `NSC.getDeal()` | the whole `doc` payload |
| `NSC.getField(k)` / `NSC.setField(k, v)` | one OTP field |
| `NSC.setFields({...})` | many OTP fields |
| `NSC.selectDocuments(["deed","A","B"])` | choose which contracts |
| `NSC.validate()` | **the STOP manifest** — `{ok, documents, missing:[{field,label}], timestamp}` |
| `NSC.generate()` | validates, then downloads. Blocks if anything required is missing |
| `NSC.generateAnyway()` | downloads with blanks left empty |
| `NSC.filenameBase()` | e.g. `OTP-Hamza Asad - 8 Totius Street, Trim Park` |
| `NSC.fields` | every valid field key |

**Always call `NSC.validate()` and check `ok` before `NSC.generate()`.** The manifest is the contract between the agent and the app — if `ok` is false, fill the listed fields rather than forcing.

### Typical agent run

```js
NSC.goToTab(7);                       // Documents
await new Promise(r => setTimeout(r, 400));
NSC.setFields({
  ls_erf: "1252", ls_street_no: "8", ls_street_name: "Totius Street",
  ls_suburb: "Trim Park", ls_city: "Mokopane", ls_municipality: "Mogalakwena",
  seller_id_1: "8001015800081", seller_marital_1: "Unmarried",
  transfer_date: "2026-10-01", occupation_date: "2026-10-01",
  dos_date: "2026-08-12", first_instal: "2026-11-01",
  sign_place: "Mokopane", sign_date: "2026-08-12",
});
NSC.selectDocuments(["deed", "A", "B"]);
const m = NSC.validate();
if (m.ok) await NSC.generate();
else console.log("STOP — missing:", m.missing.map(x => x.field));
```

### Writing straight to the database instead

For headless work, skip the browser and write `inputs` through the Supabase REST API. The app picks the values up next time the deal is opened. Use this for bulk research; use `window.NSC` when you need PDFs.

---

## 5. OTP document fields

Stored under `inputs.doc`. Keys are **stable** — never rename them.

**Property** — `ls_sectional` (`"Yes"`/`"No"`), `ls_unit_no`, `ls_section_no`, `ls_ss_name`, `ls_ss_no`, `ls_erf`, `ls_street_no`, `ls_street_name`, `ls_suburb`, `ls_city`, `ls_municipality`, `property_address`\*, `property_excluded`

**Sellers** — `seller_name_1`\*, `seller_id_1`†, `seller_marital_1`†, `seller_address_1`, `seller_cell_1`, `seller_email_1`, `seller_name_2`, `seller_id_2`, `seller_marital_2`

**Buyer** — `buyer_name_1`\*, `buyer_id_1`†, `buyer_address_1`†, `buyer_email_1`, `buyer_cell_1`, `buyer_tax` *(pre-seeded with Nine Stones' details)*

**Attorney** — `attorney_firm`†, `attorney_phone`, `attorney_email`, `attorney_address` *(pre-seeded with STBB)*

**Numbers** — `price_amount`\*, `deposit_amount`, `finance_amount` (auto = price − deposit), `interest_rate`‡, `loan_period`‡ *(months)*, `instalment`‡, `balloon_amt`, `balloon_date`

**Dates & terms** — `dos_date`‡, `transfer_date`†, `occupation_date`†, `occupation_rent`, `offer_expiry`, `bond_amount`, `bond_days`, `inspection_days`, `first_instal`, `sign_place`, `sign_date`, `special_conditions`

\* required for all three documents  † required for the Deed of Sale  ‡ required for Addendums A and B

### Behaviour worth knowing

- **`property_address` composes itself** from the `ls_*` parts, with correct sectional-title vs freehold wording, until you edit it by hand — after that it stops auto-updating.
- **`price_amount` and `deposit_amount` round to the nearest R5 000** at generation time.
- **First visit to the Documents tab seeds the fields** from the deal: seller name/phone/email, address, offer price (from the preferred method), and for ISA the rate, term and instalment. "Re-pull deal values" repeats this.

---

## 6. Templates

`public/templates/deed.pdf`, `addA.pdf`, `addB.pdf` — fetched at runtime, not bundled.

- **Deed of Sale** — 40 AcroForm fields, filled by name.
- **Addendum A (Seller Finance)** — 12 AcroForm fields.
- **Addendum B (Installment Sale)** — **no form fields**; text is drawn at fixed coordinates from `ADDB_BOXES` in `src/lib/contractFill.js`.

**When STBB changes a contract:** replace the PDF and redeploy. If field *names* change, update the mapping in `contractFill.js`. If **Addendum B's layout** changes, the `ADDB_BOXES` coordinates must be re-measured — that one is positional and will silently misplace text otherwise.

---

## 7. File naming

One naming core, shared:

```
DEAL SUMMARIZER-{Seller} - {street no + name}, {suburb}.pdf
OTP-{Seller} - {street no + name}, {suburb} - {Document}.pdf
```

Example:
- `DEAL SUMMARIZER-Hamza Asad - 8 Totius Street, Trim Park.pdf`
- `OTP-Hamza Asad - 8 Totius Street, Trim Park - Deed of Sale.pdf`

`dealFilename(prefix, seller, streetNo, streetName, suburb)` in `src/lib/contractFill.js`. Illegal filesystem characters are stripped. The street parts come from `inputs.doc.ls_*`, so **populate those before generating or filenames fall back to just the seller name**.

---

## 8. Approval gate

`inputs.approved` drives the dashboard lane — orange (unchecked) or green (approved). It is set from the Summary tab and requires ticking a confirmation that a human checked the numbers.

**Hermes should not set `approved` to true.** The whole point is that a person confirmed the figures. Hermes can prepare everything up to that line, including generating documents — the Documents tab shows a warning banner when generating on an unapproved deal, which is allowed but flagged.

---

## 9. Files

```
src/lib/calc.js            deal engine — computeDeal(), defaultInputs()
src/lib/contractFill.js    PDF fill core, number-to-words, filename rule
src/lib/docFields.js       OTP field model, validation, address composition, seeding
src/lib/pdf.js             one-page deal summary (jsPDF)
src/lib/supabaseClient.js  db client
src/components/DealCalculator.jsx    tab shell, sticky MAO, window.NSC
src/components/DocumentGenerator.jsx Documents tab
src/components/DealsList.jsx         kanban dashboard
src/components/NegotiationLog.jsx    conversation log + voice notes
src/components/ui.jsx                shared primitives
src/index.css                        brand palette + responsive grid
public/templates/*.pdf               contract templates
```

**Tests** — `node test-isa.mjs` (34 checks on the ISA engine), `node test-contracts.mjs` (fill engine, addresses, filenames, validation). Run both before deploying.

---

## 10. Deploying

The Vercel project is **not** yet linked to GitHub, so a push does not deploy. Linking it is a one-time job:

> Vercel → project `nine-stones-deal-analyser` → Settings → Git → Connect Git Repository → `KobusTaljaard/nine-stones-deal-analyser` → branch `main`.

After that, `git push` deploys. Until then deployment is a manual file upload.

Build: `npm install && npm run build`. Vite, output `dist/`.

---

## 11. Conventions

- **Never rename a field key.** Add new ones; leave old ones alone. Everything is merged over `defaultInputs()`, so extra keys are harmless and missing ones fill themselves.
- **Never write `approved: true` from an agent.**
- **Always read the STOP manifest before generating.**
- Autosave debounces ~900ms. After `setInput`, wait ~1.5s before assuming it persisted.
- The Supabase key in the client is a publishable anon key. It is meant to be public; access is governed by RLS. Do not paste service-role keys into this app.
