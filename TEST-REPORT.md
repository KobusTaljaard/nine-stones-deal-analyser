# Deal Analyser — Round 5 Report

**Live: https://nine-stones-deal-analyser.vercel.app** · build clean, deployment READY.

---

## 1. Installment (ISA) — rebuilt from scratch

You were right that it was wrong. It was showing the cash MAO because I'd tied the installment price to the cash ceiling. That was backwards. It now works the way you described: **the price comes out of the cash flow, not the other way round.**

### The waterfall

| Step | |
|---|---|
| Market rent, less vacancy | effective rent |
| − costs you carry | levies, maintenance, rates, insurance, water/electricity you pay |
| = **Net operating income** | |
| − your minimum cash flow | R1 500/mo default, editable |
| − existing bond instalment | only if you tick "take over the bond" |
| = **available for the seller's note** | |

That monthly figure is then run backwards through the present-value formula at your rate and term to give the maximum principal. **If you take over a bond, its balance is added on top** — the seller is getting that value too.

### The second ceiling

Research on this flagged one specific failure mode, and it's worth knowing: cheap rates over long terms produce a "maximum offer" far above what the property is actually worth. A 0% deal over 30 years lets the payment justify almost any price. Every serious version of this calculation pairs the cash-flow number with a **value cap**, and takes the lower of the two.

So there's a slider — "never pay more than this % of ARV", default 100% — and the app shows you which ceiling is binding. I tested this live: at a 10-year term your Hamza deal is cash-flow-bound at R1 280 400; stretch the term to 30 years and it jumps to the value ceiling at R2 400 000 and the label flips to "Value ceiling is the binding constraint". That's the guard doing its job.

### Also in there

- **DSCR** displayed, benchmarked against the 1.25× lenders look for
- Early settlement now sums the **seller note plus any remaining bond** — before it only tracked the note
- A **bond interest rate** field on Due Diligence so the bond can be properly amortised. If you tick bond takeover but haven't entered the instalment, it assumes interest-only and tells you it's assuming
- **Eviction cost is excluded from the ISA maths entirely**, as you asked — it appears as a warning banner on the Installment tab and in the Summary, and still reduces the cash offer

Verified with 34 automated checks: payment↔principal round-trips at 0/8/12.5/24%, the R1 500 target is hit exactly when cash flow binds, bond takeover splits correctly, negative cases floor at zero rather than going nonsense, no NaN anywhere.

---

## 2. Complete visual rebuild

- **New palette throughout** — navy `#002147`, gold `#d1a766`, cream `#f8f4ec`, sage, taupe. Bright green/red/amber reserved strictly for numbers that must jump out: cash flow, profit, DSCR, risk.
- **Block layout** in the style of the reference: numbered cards (01, 02, 03…), **3 across desktop, 2 tablet, 1 mobile**, stacking automatically.
- **Sticky MAO bar** on every tab — pinned to the top, and it recalculates in real time as you drag sliders further down the page. Each tab shows the number relevant to it (cash offer on the Cash tab, ISA on the Installment tab, your preferred method everywhere else), with a secondary figure alongside (profit, or cash flow).
- Rewrote the styling as a proper stylesheet rather than inline styles — that's what makes the responsive breakpoints and the sticky behaviour possible.

---

## 3. Dashboard, contacts, approval, delete

- **Kanban dashboard** with two lanes: **New leads — numbers not checked yet** (orange left border) always on top, **Analysed & approved** (green) below. Each card shows client, property, preferred acquisition method and its MAO.
- **Seller cellphone and email** on the Inputs tab, with one-tap **Call / WhatsApp / Email** links.
- **Preferred acquisition method** (Cash or Installment) — this drives which MAO shows on the dashboard and in the sticky bar.
- **Approve button** in Summary, gated behind a tick-box confirming you checked the numbers yourself. Approving moves the card to the green lane. Reversible.
- **Delete removed from the dashboard.** It's now at the bottom of the Inputs tab in a "Danger Zone" card, behind a confirmation dialog naming the deal.

---

## 4. Hamza Asad — 8 Totius St, Mokopane

Loaded and sitting in your new-leads lane. **Three things need your attention before you call him.**

**The Lightstone report is for the wrong house.** It's for **6** Totius Street, not 8. Its registered owner is a close corporation (Potties Cellular Services CC), with a R1 800 000 Nedbank bond registered in 2019. None of that can be assumed to be Hamza or his erf. I've deliberately left bond and municipal valuation at **zero** rather than importing figures that may belong to a neighbour. Pull a report for 8 Totius before relying on anything there.

**His price is roughly 2.6× the market.** He wants R6 300 000. Lightstone's comparable average for the area is R2 150 000. Trim Park evidence: 152 Kestell R2 470 000 (4 bed), 20 Slegtekamp R1 850 000 (4/3/2), 181 Fourie R1 850 000, 172 Nicol R1 900 000. I've set ARV at **R2 400 000** — top of the range, justified by excellent condition plus pool, solar and outside flat. The app is flagging the asking price as out of range.

**Cash beats installment on this one.** Max cash offer R1 626 548 (profit R240 000); max installment offer R1 280 400. The rent simply isn't high enough relative to the value to carry a bigger note — which is exactly what the new calculation is designed to reveal. Preferred method is set to Cash; switch it on the Inputs tab to compare.

Rent set at R16 000 with R20 000 top-of-range, from Mokopane listings running R15 500–R23 420 (a 4-bed in Trim Park on a large erf is asking R15 950).

Worth noting from his message: he planned to build more units at the back. Check erf size and zoning — there may be development upside the comps don't capture.

---

## Verification

- 34 automated checks on the ISA engine — all pass
- Local and Vercel production builds clean
- PDF rendered and inspected: one page, new palette, ISA breakdown included
- Live app driven in-browser: dashboard lanes correct, calculator opens, Installment tab computes the exact figures from the test suite, sticky MAO confirmed updating in real time

One caveat on the live check: the browser session reported a 0×0 viewport, so I couldn't take screenshots or confirm the 3/2/1 column behaviour visually. The breakpoints are standard CSS media queries and the build is clean — but give it a look on your phone and tablet and tell me if anything sits wrong.

---

## GitHub

The repo still isn't updated. The GitHub integration is **read-only** — it can list and read files but returns 403 on every write, and that's fixed on Anthropic's side, not something you can toggle. All updated source is synced to your `Real Estate/Deal Analyser` folder. To push: copy those files over the repo folder Hermes made on your Desktop and push from GitHub Desktop, or point GitHub Desktop at the `Real Estate/Deal Analyser` folder directly.
