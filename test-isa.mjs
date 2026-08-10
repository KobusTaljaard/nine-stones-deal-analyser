import { defaultInputs, computeDeal, pmt, principalFromPayment } from "./src/lib/calc.js";

let fails = 0;
const near = (a, b, tol = 1) => Math.abs(a - b) <= tol;
function check(name, got, want, tol = 1) {
  const ok = near(got, want, tol);
  if (!ok) fails++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}\n      got ${Math.round(got * 100) / 100}  want ${Math.round(want * 100) / 100}`);
}
function assert(name, cond, extra = "") {
  if (!cond) fails++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${name} ${extra}`);
}

console.log("\n=== 1. pmt <-> principalFromPayment round-trip ===");
for (const [rate, yrs, p] of [[0, 10, 1200000], [8, 15, 850000], [12.5, 20, 2000000], [24, 5, 300000]]) {
  const m = pmt(rate, yrs, p, 0);
  const back = principalFromPayment(rate, yrs, m);
  check(`rate ${rate}% / ${yrs}yr / principal ${p}`, back, p, 0.5);
}

console.log("\n=== 2. 0% interest: principal = payment x months ===");
check("0% 10yr, R10 670/mo", principalFromPayment(0, 10, 10670), 10670 * 120, 0.01);

console.log("\n=== 3. Cash-flow-first MAO, no bond (Hamza-style) ===");
const a = {
  ...defaultInputs(),
  propertyType: "freehold_plain", arv: 2400000, repairs: 0,
  rental: 16000, vacancy: 8, levies: 0, maint: 1500, ratesMonthly: 450,
  insuranceMonthly: 600, waterMonthly: 0, tenantPaysWater: true, elecPrepaid: true,
  minCashflow: 1500, takeOverBond: false, instRate: 0, instYrs: 10, isaMaxPctOfArv: 100,
};
const ca = computeDeal(a);
check("effective rent", ca.effRent, 16000 * 0.92);
check("landlord costs", ca.landlordCosts, 1500 + 450 + 600);
check("NOI", ca.isaNoi, 14720 - 2550);
check("budget after min cashflow", ca.isaBudget, 12170 - 1500);
check("seller payment available", ca.isaSellerPmt, 10670);
check("cash-flow ceiling", ca.isaCashflowCeiling, 10670 * 120);
check("value ceiling", ca.isaValueCeiling, 2400000);
assert("cash-flow ceiling binds", ca.isaBinding === "cashflow");
check("ISA MAO", ca.isaMao, 1280400);
check("monthly to seller", ca.isaMonthlyToSeller, 10670);
check("actual cash flow == target", ca.isaActualCashflow, 1500);
assert("viable", ca.isaViable === true);

console.log("\n=== 4. Long term at 0% -> value ceiling must bind ===");
const b = computeDeal({ ...a, instYrs: 30 });
check("uncapped cash-flow ceiling", b.isaCashflowCeiling, 10670 * 360);
assert("value ceiling binds", b.isaBinding === "value");
check("MAO capped at value ceiling", b.isaMao, 2400000);
assert("actual cash flow exceeds minimum when value binds", b.isaActualCashflow > 1500,
  `(R${Math.round(b.isaActualCashflow)}/mo)`);

console.log("\n=== 5. Bond takeover is added into the price ===");
const c = computeDeal({
  ...a, takeOverBond: true, bondAmount: 800000, bondMonthly: 8500, bondRate: 11.75, instYrs: 10,
});
check("bond payment used", c.isaBondPmt, 8500);
check("seller payment after bond", c.isaSellerPmt, 10670 - 8500);
check("seller principal", c.isaSellerPrincipal, (10670 - 8500) * 120);
check("MAO = seller note + bond assumed", c.isaMao, (10670 - 8500) * 120 + 800000);
check("total debt service", c.isaDebtService, 10670);
check("cash flow still hits target", c.isaActualCashflow, 1500);
assert("seller-financed portion excludes bond",
  near(c.isaSellerFinanced, c.isaMao - 800000, 1));

console.log("\n=== 6. Not viable when rent cannot carry it ===");
const d = computeDeal({ ...a, rental: 3000, takeOverBond: true, bondAmount: 800000, bondMonthly: 8500 });
assert("seller payment is negative", d.isaSellerPmt < 0);
assert("seller principal floors at 0", d.isaSellerPrincipal === 0);
assert("MAO never negative", d.isaMao >= 0);

console.log("\n=== 7. Missing bond instalment falls back to interest-only ===");
const e = computeDeal({ ...a, takeOverBond: true, bondAmount: 800000, bondMonthly: 0, bondRate: 12 });
check("assumed interest-only payment", e.isaBondPmt, 800000 * 0.12 / 12);
assert("flagged as assumed", e.isaBondPmtAssumed === true);

console.log("\n=== 8. DSCR ===");
check("DSCR = NOI / debt service", ca.isaDscr, ca.isaNoi / ca.isaDebtService, 0.001);
assert("DSCR above 1 when cash flow positive", ca.isaDscr > 1);

console.log("\n=== 9. Eviction excluded from ISA, still in cash offer ===");
const occ = { ...a, occupied: true, evictionLegalCost: 40000, evictionMonths: 9, evictionHoldingMonthly: 2000 };
const cOcc = computeDeal(occ);
const cClean = computeDeal({ ...a });
check("ISA MAO unchanged by occupier", cOcc.isaMao, cClean.isaMao);
assert("cash offer IS reduced by occupier", cOcc.cash < cClean.cash,
  `(R${Math.round(cClean.cash)} -> R${Math.round(cOcc.cash)})`);
check("eviction exposure", cOcc.evictionExposure, 40000 + 2000 * 9);

console.log("\n=== 10. Early settlement includes assumed bond ===");
const f = computeDeal({ ...a, takeOverBond: true, bondAmount: 800000, bondMonthly: 8500, areaGrowthPct: 5, targetRefiLtv: 65 });
assert("earliest settlement month found", f.isaEarliestMonth !== null, `(month ${f.isaEarliestMonth})`);
if (f.isaEarliestMonth !== null) {
  const ltv = f.isaEarliestOwed / f.isaEarliestValue * 100;
  assert("owed/value at that month <= target LTV", ltv <= 65.001, `(${ltv.toFixed(2)}%)`);
}

console.log("\n=== 11. Defaults produce no NaN/Infinity ===");
const dflt = computeDeal(defaultInputs());
const bad = Object.entries(dflt).filter(([, v]) => typeof v === "number" && !isFinite(v));
assert("no non-finite numbers in default deal", bad.length === 0, bad.map(([k]) => k).join(", "));

console.log(`\n${fails === 0 ? "ALL CHECKS PASSED" : fails + " CHECK(S) FAILED"}\n`);
process.exit(fails === 0 ? 0 : 1);
