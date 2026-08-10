// ═══════════════════════════════════════════════════════════════
// Nine Stones Capital — deal calculation engine
// ═══════════════════════════════════════════════════════════════

export function transferDuty(p) {
  if (!isFinite(p) || p <= 0) return 0;
  if (p <= 1100000) return 0;
  if (p <= 1512500) return (p - 1100000) * 0.03;
  if (p <= 2117500) return 12375 + (p - 1512500) * 0.06;
  if (p <= 2722500) return 49125 + (p - 2117500) * 0.08;
  if (p <= 12100000) return 97525 + (p - 2722500) * 0.11;
  return 1128600 + (p - 12100000) * 0.13;
}

export function conveyancing(p) {
  if (!isFinite(p) || p <= 0) return 0;
  return Math.round((8500 + p * 0.011) * 1.15);
}

// Monthly payment for a given principal.
export function pmt(annualRatePct, years, principal, balloonPct = 0) {
  const n = years * 12;
  if (n <= 0 || !isFinite(principal) || principal <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  const balloon = principal * balloonPct / 100;
  if (r === 0) return (principal - balloon) / n;
  const pv = principal - balloon / Math.pow(1 + r, n);
  return r * pv / (1 - Math.pow(1 + r, -n));
}

// Inverse of pmt: the maximum principal a given monthly payment can carry.
// This is what makes the ISA a true "price from the payment" calculation.
export function principalFromPayment(annualRatePct, years, monthlyPmt) {
  const n = years * 12;
  if (n <= 0 || !isFinite(monthlyPmt) || monthlyPmt <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  if (r === 0) return monthlyPmt * n;
  return monthlyPmt * (1 - Math.pow(1 + r, -n)) / r;
}

export function amortizationBalances(principal, annualRatePct, months, monthlyPmt) {
  const start = Math.max(0, principal || 0);
  const balances = [start];
  if (!isFinite(months) || months <= 0) return balances;
  const r = annualRatePct / 100 / 12;
  let b = start;
  for (let m = 1; m <= months; m++) {
    const interest = b * r;
    const princPortion = monthlyPmt - interest;
    b = Math.max(0, b - princPortion);
    balances.push(b);
  }
  return balances;
}

export function sfRateForDeposit(depositPct) {
  if (!depositPct || depositPct <= 0) return 18;
  if (depositPct <= 5) return 16;
  if (depositPct <= 10) return 15;
  return 14;
}

export function lofPctForTerm(years) {
  const table = { 1: 3, 2: 4, 3: 5, 4: 6, 5: 7.5 };
  const y = Math.max(1, Math.min(5, Math.round(years || 1)));
  return table[y];
}

export function R(n) {
  if (!isFinite(n) || isNaN(n)) return "—";
  const abs = Math.round(Math.abs(n)).toLocaleString("en-ZA").replace(/,/g, " ");
  return (n < 0 ? "−" : "") + "R " + abs;
}
export function pct(n, d = 1) {
  if (!isFinite(n) || isNaN(n)) return "—";
  return n.toFixed(d) + "%";
}
export function num(n, d = 2) {
  if (!isFinite(n) || isNaN(n)) return "—";
  return n.toFixed(d);
}

// Brand palette
export const C = {
  navy: "#002147",
  gold: "#d1a766",
  white: "#ffffff",
  cream: "#f8f4ec",
  sage: "#7a8f85",
  taupe: "#c8beb0",
  ink: "#002147",
  muted: "#6b7a89",
  line: "#e6ded2",
  pos: "#0e9f5b",
  neg: "#d93a3a",
  warn: "#e8871e",
  fresh: "#f2711c",
};

export function scoreTone(profit, arv) {
  if (!arv || !isFinite(profit)) return "mut";
  const r = profit / arv;
  if (r >= 0.12) return "pos";
  if (r >= 0.06) return "warn";
  return "neg";
}
export function flowTone(v) {
  if (!isFinite(v)) return "mut";
  if (v > 2000) return "pos";
  if (v >= 0) return "warn";
  return "neg";
}

export const OCCUPIER_TYPES = [
  { value: "squatter", label: "Unlawful occupier / squatter" },
  { value: "holdover_tenant", label: "Holdover tenant (lease expired)" },
  { value: "family_member", label: "Family / friend of seller or deceased owner" },
  { value: "other", label: "Other non-paying occupant" },
];

export const PROPERTY_TYPES = [
  { value: "sectional_title", label: "Sectional Title", levyLabel: "Body Corporate Levy / Month", hasLevy: true, desc: "Body corporate manages common property. Monthly levy is compulsory." },
  { value: "freehold_hoa", label: "Freehold — HOA / Estate", levyLabel: "HOA / Estate Levy / Month", hasLevy: true, desc: "Standalone title, but a Homeowners Association or gated estate charges a compulsory monthly fee." },
  { value: "freehold_plain", label: "Freehold — No Levy", levyLabel: "", hasLevy: false, desc: "Standalone title, no body corporate or HOA. No compulsory monthly levy." },
];

export const ACQUISITION_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "isa", label: "Installment (ISA)" },
];

export function propertyTypeConfig(propertyType) {
  return PROPERTY_TYPES.find((p) => p.value === propertyType) || PROPERTY_TYPES[0];
}

export function defaultInputs() {
  return {
    clientName: "",
    propAddress: "",
    sellerPhone: "",
    sellerEmail: "",

    preferredMethod: "cash",
    approved: false,
    approvedAt: null,

    arv: 1500000,
    arvPct: 80,
    repairs: 150000,
    rental: 12000,
    rentalHigh: 15000,
    asking: 1300000,
    gutFeel: 1500000,

    propertyType: "sectional_title",

    vacancy: 8,
    levies: 2500,
    maint: 1500,
    insuranceMonthly: 600,

    flipPct: 7,

    // ── Installment sale (ISA) ──
    minCashflow: 1500,
    takeOverBond: false,
    isaMaxPctOfArv: 100,
    instRate: 0,
    instYrs: 10,
    areaGrowthPct: 4,
    targetRefiLtv: 65,
    refiCostsPct: 5,
    settlementMonth: 0,

    sfDepositPct: 10,
    sfYrs: 20,
    sfSettlementMonth: 0,

    rtoAsIsOverrideOn: false,
    rtoAsIsOverride: 0,
    rtoTerm: 3,

    strNightly: 800,
    strOccupancy: 65,

    bLtv: 70,
    bRate: 12.5,
    bBondYears: 20,
    bInterestOnly: false,

    munVal: 0,
    listedPrice: 0,
    daysOnMarket: 0,

    bondAmount: 0,
    bondArrears: 0,
    bondMonthly: 0,
    bondRate: 11.75,
    bondEndYear: new Date().getFullYear() + 20,

    ratesMonthly: 0,
    ratesArrears: 0,
    leviesArrears: 0,

    waterMonthly: 0,
    tenantPaysWater: false,

    elecPrepaid: true,
    elecAvg3mo: 0,

    occupied: false,
    occupierType: "squatter",
    evictionMonths: 9,
    evictionLegalCost: 40000,
    evictionHoldingMonthly: 0,

    sellerMotivatedPrice: 0,
    sellerWalkAwayPrice: 0,
    sellerPrefersInstallment: false,
    negotiationLog: [],

    summaryNotes: "",
  };
}

export function computeDeal(inp) {
  const {
    arv, arvPct, repairs, rental, rentalHigh, asking,
    propertyType,
    vacancy, levies: leviesRaw, maint, insuranceMonthly, flipPct,
    minCashflow, takeOverBond, isaMaxPctOfArv,
    instRate, instYrs, areaGrowthPct, targetRefiLtv, refiCostsPct, settlementMonth,
    sfDepositPct, sfYrs, sfSettlementMonth,
    rtoAsIsOverrideOn, rtoAsIsOverride, rtoTerm,
    strNightly, strOccupancy,
    bLtv, bRate, bBondYears, bInterestOnly,
    bondAmount, bondArrears, bondMonthly, bondRate, ratesArrears, leviesArrears,
    ratesMonthly, waterMonthly, tenantPaysWater, elecPrepaid, elecAvg3mo,
    occupied, evictionMonths, evictionLegalCost, evictionHoldingMonthly,
    sellerMotivatedPrice, sellerWalkAwayPrice,
    preferredMethod,
  } = inp;

  const levyApplies = propertyTypeConfig(propertyType).hasLevy;
  const levies = levyApplies ? leviesRaw : 0;

  const totalArrears = bondArrears + ratesArrears + leviesArrears;
  const waterCost = tenantPaysWater ? 0 : waterMonthly;
  const elecCost = elecPrepaid ? 0 : elecAvg3mo;
  const totalMonthlyExp = ratesMonthly + levies + waterCost + elecCost;

  const riskLevel = (() => {
    const hasHighArrears = totalArrears > 50000;
    const bondHeavy = arv > 0 && bondAmount > arv * 0.75;
    if (occupied || hasHighArrears || bondHeavy) return "high";
    if (totalArrears > 15000 || (arv > 0 && bondAmount > arv * 0.55)) return "medium";
    return "low";
  })();

  const evictHoldMonthly = evictionHoldingMonthly > 0 ? evictionHoldingMonthly : totalMonthlyExp;
  const evictionExposure = occupied ? evictionLegalCost + evictHoldMonthly * evictionMonths : 0;

  // ── CASH OFFER ────────────────────────────────────────────────
  const gross = arv * arvPct / 100;
  const minP = Math.max(100000, arv * 0.1);
  const approx = gross - repairs - minP;
  const td = transferDuty(approx);
  const cv = conveyancing(approx);
  const costs = td + cv;
  const cash = gross - repairs - minP - costs - evictionExposure;
  const cashP = gross - cash - repairs - costs - evictionExposure;
  const cashIn = cash + repairs + costs + evictionExposure;
  const gap = cash - asking;

  // ── RENTAL OPERATING PICTURE ──────────────────────────────────
  const effRent = rental * (1 - vacancy / 100);
  const opex = levies + maint;                         // BTL simple opex
  const btlFlow = effRent - opex;
  const btlROI = cashIn > 0 ? (btlFlow * 12) / cashIn * 100 : null;

  // Landlord-borne costs: everything NOT recovered from the tenant.
  // A defaulting tenant is deliberately excluded here (warning only).
  const landlordCosts = levies + maint + ratesMonthly + waterCost + elecCost + (insuranceMonthly || 0);
  const isaNoi = effRent - landlordCosts;

  // ── INSTALLMENT SALE AGREEMENT (ISA) — MAO FROM CASH FLOW ─────
  // Step 1: what's left each month once the required cash flow is kept back
  const isaBudget = isaNoi - (minCashflow || 0);
  // Step 2: an assumed bond eats into that same budget
  const isaBondTakeover = takeOverBond ? Math.max(0, bondAmount) : 0;
  const isaBondPmt = takeOverBond
    ? (bondMonthly > 0 ? bondMonthly : isaBondTakeover * (bondRate / 100 / 12))
    : 0;
  const isaBondPmtAssumed = takeOverBond && !(bondMonthly > 0);
  // Step 3: what remains is what the seller's note can be serviced with
  const isaSellerPmt = isaBudget - isaBondPmt;
  // Step 4: back-solve that payment into a principal
  const isaSellerPrincipal = principalFromPayment(instRate, instYrs, Math.max(0, isaSellerPmt));
  // Step 5: the bond you assume is part of what the seller receives
  const isaCashflowCeiling = isaSellerPrincipal + isaBondTakeover;

  // Value ceiling — guards against long/cheap terms pricing you above the asset.
  const isaValueCeiling = Math.max(0, arv * (isaMaxPctOfArv || 100) / 100 - repairs);

  const isaViable = isaSellerPmt > 0 || isaBondTakeover > 0;
  const isaMao = Math.max(0, Math.min(isaCashflowCeiling, isaValueCeiling));
  const isaBinding = isaCashflowCeiling <= isaValueCeiling ? "cashflow" : "value";

  // Re-derive the actual deal at the binding MAO
  const isaSellerFinanced = Math.max(0, isaMao - isaBondTakeover);
  const isaMonths = instYrs * 12;
  const isaMonthlyToSeller = pmt(instRate, instYrs, isaSellerFinanced, 0);
  const isaDebtService = isaMonthlyToSeller + isaBondPmt;
  const isaActualCashflow = isaNoi - isaDebtService;
  const isaDscr = isaDebtService > 0 ? isaNoi / isaDebtService : null;
  const isaTotalPaid = isaMonthlyToSeller * isaMonths + isaBondTakeover;
  const isaInterest = isaMonthlyToSeller * isaMonths - isaSellerFinanced;
  const isaPremiumVsCash = isaMao - cash;
  const isaUpfront = repairs + transferDuty(isaMao) + conveyancing(isaMao);

  // Early settlement: seller note + any assumed bond must both clear
  const isaSellerSched = amortizationBalances(isaSellerFinanced, instRate, isaMonths, isaMonthlyToSeller);
  const isaBondSched = isaBondTakeover > 0
    ? amortizationBalances(isaBondTakeover, bondRate, isaMonths, isaBondPmt)
    : null;
  const owedAt = (m) => (isaSellerSched[m] || 0) + (isaBondSched ? (isaBondSched[m] || 0) : 0);
  const valueAt = (m) => arv * Math.pow(1 + areaGrowthPct / 100, m / 12);

  let isaEarliestMonth = null;
  for (let m = 1; m <= isaMonths; m++) {
    if (owedAt(m) <= valueAt(m) * targetRefiLtv / 100) { isaEarliestMonth = m; break; }
  }
  const isaEarliestOwed = isaEarliestMonth !== null ? owedAt(isaEarliestMonth) : null;
  const isaEarliestValue = isaEarliestMonth !== null ? valueAt(isaEarliestMonth) : null;

  const isaChosenMonth = settlementMonth > 0 ? Math.min(Math.round(settlementMonth), isaMonths) : isaEarliestMonth;
  const isaChosenOwed = isaChosenMonth !== null ? owedAt(isaChosenMonth) : null;
  const isaChosenValue = isaChosenMonth !== null ? valueAt(isaChosenMonth) : null;
  const isaChosenLtv = (isaChosenOwed !== null && isaChosenValue) ? (isaChosenOwed / isaChosenValue * 100) : null;
  const isaMeetsTarget = isaChosenLtv !== null ? isaChosenLtv <= targetRefiLtv : null;
  const isaRefiCeiling = isaChosenValue !== null ? isaChosenValue * (targetRefiLtv + refiCostsPct) / 100 : null;

  // BTL under the structured purchase
  const btlInstFlow = btlFlow - isaDebtService;

  // ── OTHER EXITS ───────────────────────────────────────────────
  const strMonthly = strNightly * (strOccupancy / 100) * 30;
  const strFlow = strMonthly - opex - strMonthly * 0.2;

  const flipSell = arv * flipPct / 100;
  const flipProfit = arv - cash - repairs - costs - flipSell;

  const asIsAuto = Math.max(0, arv - repairs);
  const asIsValue = rtoAsIsOverrideOn && rtoAsIsOverride > 0 ? rtoAsIsOverride : asIsAuto;
  const rtoPrice = asIsValue * 1.2;

  const sfp = asIsValue * 1.2;
  const sfRate = sfRateForDeposit(sfDepositPct);
  const sfDepositAmt = sfp * (sfDepositPct || 0) / 100;
  const sfLoanAmt = Math.max(0, sfp - sfDepositAmt);
  const sfMonths = sfYrs * 12;
  const sfM = pmt(sfRate, sfYrs, sfLoanAmt, 0);
  const sfSpread = sfM - isaDebtService;
  const sfTotal = sfM * sfMonths + sfDepositAmt;
  const sfSchedule = amortizationBalances(sfLoanAmt, sfRate, sfMonths, sfM);
  const sfChosenMonth = sfSettlementMonth > 0 ? Math.min(Math.round(sfSettlementMonth), sfMonths) : null;
  const sfSettleBalance = sfChosenMonth !== null ? sfSchedule[sfChosenMonth] : null;

  const rtoLofPct = lofPctForTerm(rtoTerm);
  const rtoMonthly = rentalHigh * 1.10;
  const rtoSpread = rtoMonthly - isaDebtService;
  const rtoOptionFee = rtoPrice * rtoLofPct / 100;
  const rtoPriceIfExercised = rtoPrice - rtoOptionFee;

  const refAmt = arv * bLtv / 100;
  const cashLeft = Math.max(0, cashIn - refAmt);
  const cashOut = Math.max(0, refAmt - cashIn);
  const bPmt = bInterestOnly ? refAmt * (bRate / 100 / 12) : pmt(bRate, bBondYears, refAmt, 0);
  const brrrrFlow = btlFlow - bPmt;
  const bCoC = cashLeft > 1000 ? (brrrrFlow * 12) / cashLeft * 100 : null;

  // ── NEGOTIATION ───────────────────────────────────────────────
  const headlineMao = preferredMethod === "isa" ? isaMao : cash;
  const clearsMotivated = sellerMotivatedPrice > 0 && headlineMao >= sellerMotivatedPrice;
  const clearsWalkAway = sellerWalkAwayPrice > 0 && headlineMao >= sellerWalkAwayPrice;
  const gapToMotivated = sellerMotivatedPrice > 0 ? headlineMao - sellerMotivatedPrice : null;
  const gapToWalkAway = sellerWalkAwayPrice > 0 ? headlineMao - sellerWalkAwayPrice : null;

  return {
    levies, levyApplies,
    totalArrears, totalMonthlyExp, riskLevel,
    evictHoldMonthly, evictionExposure,
    gross, minP, td, cv, costs, cash, cashP, cashIn, gap,

    landlordCosts, isaNoi, isaBudget, isaBondTakeover, isaBondPmt, isaBondPmtAssumed,
    isaSellerPmt, isaSellerPrincipal, isaCashflowCeiling, isaValueCeiling,
    isaViable, isaMao, isaBinding, isaSellerFinanced, isaMonths, isaMonthlyToSeller,
    isaDebtService, isaActualCashflow, isaDscr, isaTotalPaid, isaInterest,
    isaPremiumVsCash, isaUpfront,
    isaEarliestMonth, isaEarliestOwed, isaEarliestValue,
    isaChosenMonth, isaChosenOwed, isaChosenValue, isaChosenLtv, isaMeetsTarget, isaRefiCeiling,

    effRent, opex, btlFlow, btlROI, btlInstFlow,
    strMonthly, strFlow,
    flipSell, flipProfit,
    asIsValue, asIsAuto,
    rtoPrice, rtoLofPct, rtoPriceIfExercised,
    sfp, sfRate, sfDepositAmt, sfLoanAmt, sfMonths, sfM, sfSpread, sfTotal, sfChosenMonth, sfSettleBalance,
    rtoMonthly, rtoSpread, rtoOptionFee,
    refAmt, cashLeft, cashOut, bPmt, brrrrFlow, bCoC,
    bondMonthly,
    headlineMao,
    clearsMotivated, clearsWalkAway, gapToMotivated, gapToWalkAway,
  };
}

export function methodLabel(m) {
  return (ACQUISITION_METHODS.find((x) => x.value === m) || ACQUISITION_METHODS[0]).label;
}
