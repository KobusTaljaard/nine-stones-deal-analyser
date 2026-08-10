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

export function pmt(annualRatePct, years, principal, balloonPct = 0) {
  const n = years * 12;
  if (n <= 0 || !isFinite(principal)) return 0;
  const r = annualRatePct / 100 / 12;
  const balloon = principal * balloonPct / 100;
  if (r === 0) return (principal - balloon) / n;
  const pv = principal - balloon / Math.pow(1 + r, n);
  return r * pv / (1 - Math.pow(1 + r, -n));
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
  const abs = Math.round(Math.abs(n)).toLocaleString("en-ZA");
  return (n < 0 ? "−" : "") + "R " + abs;
}
export function pct(n, d = 1) {
  if (!isFinite(n) || isNaN(n)) return "—";
  return n.toFixed(d) + "%";
}

export const C = {
  bg: "#090D18",
  card: "#0F1623",
  border: "#1A2640",
  blue: "#2563EB",
  blueL: "#3B82F6",
  green: "#10B981",
  amber: "#F59E0B",
  red: "#EF4444",
  text: "#E2E8F0",
  sub: "#64748B",
  dim: "#94A3B8",
  purple: "#8B5CF6",
};

export function scoreColor(profit, arv) {
  if (!arv || !isFinite(profit)) return C.dim;
  const r = profit / arv;
  if (r >= 0.12) return C.green;
  if (r >= 0.06) return C.amber;
  return C.red;
}
export function flowColor(v) {
  if (!isFinite(v)) return C.dim;
  if (v > 2000) return C.green;
  if (v >= 0) return C.amber;
  return C.red;
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

export function propertyTypeConfig(propertyType) {
  return PROPERTY_TYPES.find((p) => p.value === propertyType) || PROPERTY_TYPES[0];
}

export function defaultInputs() {
  return {
    clientName: "",
    propAddress: "",

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

    flipPct: 7,

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
    vacancy, levies: leviesRaw, maint, flipPct,
    instRate, instYrs, areaGrowthPct, targetRefiLtv, refiCostsPct, settlementMonth,
    sfDepositPct, sfYrs, sfSettlementMonth,
    rtoAsIsOverrideOn, rtoAsIsOverride, rtoTerm,
    strNightly, strOccupancy,
    bLtv, bRate, bBondYears, bInterestOnly,
    bondAmount, bondArrears, ratesArrears, leviesArrears,
    ratesMonthly, waterMonthly, tenantPaysWater, elecPrepaid, elecAvg3mo, bondMonthly,
    occupied, evictionMonths, evictionLegalCost, evictionHoldingMonthly,
    sellerMotivatedPrice, sellerWalkAwayPrice,
  } = inp;

  const levyApplies = propertyTypeConfig(propertyType).hasLevy;
  const levies = levyApplies ? leviesRaw : 0;

  const totalArrears = bondArrears + ratesArrears + leviesArrears;
  const totalMonthlyExp = ratesMonthly + levies + (tenantPaysWater ? 0 : waterMonthly) + (elecPrepaid ? 0 : elecAvg3mo);

  const riskLevel = (() => {
    const hasHighArrears = totalArrears > 50000;
    const bondHeavy = arv > 0 && bondAmount > arv * 0.75;
    if (occupied || hasHighArrears || bondHeavy) return "high";
    if (totalArrears > 15000 || (arv > 0 && bondAmount > arv * 0.55)) return "medium";
    return "low";
  })();

  const evictHoldMonthly = evictionHoldingMonthly > 0 ? evictionHoldingMonthly : totalMonthlyExp;
  const evictionExposure = occupied ? evictionLegalCost + evictHoldMonthly * evictionMonths : 0;

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

  const moa = cash;
  const ip = moa;
  const iMonths = instYrs * 12;
  const iMo = pmt(instRate, instYrs, ip, 0);
  const iTotal = iMo * iMonths;
  const iInterest = iTotal - ip;

  const iSchedule = amortizationBalances(ip, instRate, iMonths, iMo);
  let iEarliestMonth = null;
  for (let m = 1; m <= iMonths; m++) {
    const valueAtM = arv * Math.pow(1 + areaGrowthPct / 100, m / 12);
    const ceiling = valueAtM * targetRefiLtv / 100;
    if (iSchedule[m] <= ceiling) { iEarliestMonth = m; break; }
  }
  const iEarliestBalance = iEarliestMonth !== null ? iSchedule[iEarliestMonth] : null;
  const iEarliestValue = iEarliestMonth !== null ? arv * Math.pow(1 + areaGrowthPct / 100, iEarliestMonth / 12) : null;

  const iChosenMonth = settlementMonth > 0 ? Math.min(Math.round(settlementMonth), iMonths) : iEarliestMonth;
  const iChosenBalance = iChosenMonth !== null ? iSchedule[iChosenMonth] : null;
  const iChosenValue = iChosenMonth !== null ? arv * Math.pow(1 + areaGrowthPct / 100, iChosenMonth / 12) : null;
  const iChosenLtv = (iChosenBalance !== null && iChosenValue) ? (iChosenBalance / iChosenValue * 100) : null;
  const iMeetsTarget = iChosenLtv !== null ? iChosenLtv <= targetRefiLtv : null;
  const iRefiExposureCeiling = iChosenValue !== null ? iChosenValue * (targetRefiLtv + refiCostsPct) / 100 : null;

  const effRent = rental * (1 - vacancy / 100);
  const opex = levies + maint;
  const btlFlow = effRent - opex;
  const btlROI = cashIn > 0 ? (btlFlow * 12) / cashIn * 100 : null;
  const btlInstFlow = btlFlow - iMo;

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
  const sfSpread = sfM - iMo;
  const sfTotal = sfM * sfMonths + sfDepositAmt;
  const sfSchedule = amortizationBalances(sfLoanAmt, sfRate, sfMonths, sfM);
  const sfChosenMonth = sfSettlementMonth > 0 ? Math.min(Math.round(sfSettlementMonth), sfMonths) : null;
  const sfSettleBalance = sfChosenMonth !== null ? sfSchedule[sfChosenMonth] : null;

  const rtoLofPct = lofPctForTerm(rtoTerm);
  const rtoMonthly = rentalHigh * 1.10;
  const rtoSpread = rtoMonthly - iMo;
  const rtoOptionFee = rtoPrice * rtoLofPct / 100;
  const rtoPriceIfExercised = rtoPrice - rtoOptionFee;

  const refAmt = arv * bLtv / 100;
  const cashLeft = Math.max(0, cashIn - refAmt);
  const cashOut = Math.max(0, refAmt - cashIn);
  const bPmt = bInterestOnly ? refAmt * (bRate / 100 / 12) : pmt(bRate, bBondYears, refAmt, 0);
  const brrrrFlow = btlFlow - bPmt;
  const bCoC = cashLeft > 1000 ? (brrrrFlow * 12) / cashLeft * 100 : null;

  const clearsMotivated = sellerMotivatedPrice > 0 && cash >= sellerMotivatedPrice;
  const clearsWalkAway = sellerWalkAwayPrice > 0 && cash >= sellerWalkAwayPrice;
  const gapToMotivated = sellerMotivatedPrice > 0 ? cash - sellerMotivatedPrice : null;
  const gapToWalkAway = sellerWalkAwayPrice > 0 ? cash - sellerWalkAwayPrice : null;

  return {
    levies, levyApplies,
    totalArrears, totalMonthlyExp, riskLevel,
    evictHoldMonthly, evictionExposure,
    gross, minP, td, cv, costs, cash, cashP, cashIn, gap,
    moa, ip, iMo, iMonths, iTotal, iInterest,
    iEarliestMonth, iEarliestBalance, iEarliestValue,
    iChosenMonth, iChosenBalance, iChosenValue, iChosenLtv, iMeetsTarget, iRefiExposureCeiling,
    effRent, opex, btlFlow, btlROI, btlInstFlow,
    strMonthly, strFlow,
    flipSell, flipProfit,
    asIsValue, asIsAuto,
    rtoPrice, rtoLofPct, rtoPriceIfExercised,
    sfp, sfRate, sfDepositAmt, sfLoanAmt, sfMonths, sfM, sfSpread, sfTotal, sfChosenMonth, sfSettleBalance,
    rtoMonthly, rtoSpread, rtoOptionFee,
    refAmt, cashLeft, cashOut, bPmt, brrrrFlow, bCoC,
    bondMonthly,
    clearsMotivated, clearsWalkAway, gapToMotivated, gapToWalkAway,
  };
}
