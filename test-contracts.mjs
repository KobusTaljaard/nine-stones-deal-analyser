import * as PDFLib from "./node_modules/pdf-lib/cjs/index.js";
import fs from "fs";
import { fillDeed, fillAddA, fillAddB, dealFilename, round5000 } from "./src/lib/contractFill.js";
import { validateDocs, seedDocFromDeal, composeAddress, DOC_SEED } from "./src/lib/docFields.js";
import { defaultInputs, computeDeal } from "./src/lib/calc.js";

const T = "./public/templates";
let fails = 0;
const ok = (n, c, extra="") => { if(!c) fails++; console.log(`${c?"PASS":"FAIL"}  ${n} ${extra}`); };

// Realistic ISA deal
const inp = { ...defaultInputs(),
  clientName:"Hamza Asad", propAddress:"8 Totius St, Trim Park, Mokopane",
  sellerPhone:"+27 61 786 7868", sellerEmail:"hamzaasad07861@gmail.com",
  preferredMethod:"isa", propertyType:"freehold_plain",
  arv:2400000, repairs:0, rental:16000, ratesMonthly:450, insuranceMonthly:600, maint:1500,
  tenantPaysWater:true, minCashflow:1500, instRate:0, instYrs:10 };
const c = computeDeal(inp);

const seeded = seedDocFromDeal(inp, c);
ok("seed carries seller name", seeded.seller_name_1 === "Hamza Asad");
ok("seed carries buyer default", seeded.buyer_name_1 === "Nine Stones Capital (Pty) Ltd");
ok("price rounded to R5000", seeded.price_amount % 5000 === 0, `(${seeded.price_amount} from ${Math.round(c.isaMao)})`);
ok("instalment from ISA", Math.abs(+seeded.instalment - c.isaMonthlyToSeller) < 1, `(${seeded.instalment})`);
ok("loan period in months", seeded.loan_period === "120");

// address composition
const freehold = composeAddress({ ...seeded, ls_erf:"1252", ls_street_no:"8", ls_street_name:"Totius Street", ls_suburb:"Trim Park", ls_city:"Mokopane", ls_municipality:"Mogalakwena" });
ok("freehold address", freehold === "Erf 1252, 8 Totius Street, Trim Park, Mokopane, Mogalakwena", `\n      -> ${freehold}`);
const sectional = composeAddress({ ls_sectional:"Yes", ls_unit_no:"4", ls_section_no:"4", ls_ss_name:"De Beer Court", ls_ss_no:"123/1998", ls_street_no:"534", ls_street_name:"De Beer Street", ls_suburb:"Wonderboom South", ls_city:"Pretoria" });
ok("sectional address", sectional.includes("Unit 4") && sectional.includes("scheme De Beer Court") && sectional.includes("situated at"), `\n      -> ${sectional}`);

// validation manifest
const empty = validateDocs({}, ["deed"]);
ok("empty deal blocks deed", !empty.ok && empty.missing.length > 0, `(${empty.missing.length} missing)`);
const full = { ...seeded, ls_erf:"1252", ls_street_no:"8", ls_street_name:"Totius Street", ls_suburb:"Trim Park",
  property_address: freehold, seller_id_1:"8001015800081", seller_marital_1:"Unmarried",
  transfer_date:"2026-10-01", occupation_date:"2026-10-01", dos_date:"2026-08-12",
  first_instal:"2026-11-01", sign_place:"Mokopane", sign_date:"2026-08-12" };
const v = validateDocs(full, ["deed","A","B"]);
ok("complete deal passes all three", v.ok, v.ok ? "" : `missing: ${v.missing.map(m=>m.field).join(", ")}`);

// filenames
const base = dealFilename("OTP", full.seller_name_1, full.ls_street_no, full.ls_street_name, full.ls_suburb);
ok("OTP filename", base === "OTP-Hamza Asad - 8 Totius Street, Trim Park", `\n      -> ${base}`);
const sum = dealFilename("DEAL SUMMARIZER", full.seller_name_1, full.ls_street_no, full.ls_street_name, full.ls_suburb);
ok("summary filename shares core", sum === "DEAL SUMMARIZER-Hamza Asad - 8 Totius Street, Trim Park", `\n      -> ${sum}`);
ok("illegal chars stripped", !/[\\/:*?"<>|]/.test(dealFilename("OTP","A/B:C*D","1","X?St","Y|Z")));

// actually fill the PDFs
const jobs = [["deed", fillDeed, "deed.pdf"], ["addA", fillAddA, "addA.pdf"], ["addB", fillAddB, "addB.pdf"]];
for (const [name, fn, file] of jobs) {
  const bytes = new Uint8Array(fs.readFileSync(`${T}/${file}`));
  const out = await fn(PDFLib, bytes, full);
  fs.writeFileSync(`/tmp/out_${name}.pdf`, out);
  const head = Buffer.from(out.slice(0,5)).toString();
  ok(`${name} fills and saves`, head === "%PDF-" && out.length > 5000, `(${out.length} bytes)`);
}
console.log(`\n${fails===0 ? "ALL CHECKS PASSED" : fails+" FAILED"}`);
process.exit(fails?1:0);
