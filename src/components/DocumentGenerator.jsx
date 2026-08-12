import { useEffect, useMemo, useRef, useState } from "react";
import { R } from "../lib/calc.js";
import {
  DOC_SECTIONS, DOC_FIELD, DOC_KEYS, DOC_TYPES,
  composeAddress, validateDocs, seedDocFromDeal,
} from "../lib/docFields.js";
import { dealFilename, round5000, toNum, fillDeed, fillAddA, fillAddB } from "../lib/contractFill.js";
import { Grid, Card, Note, Row, Hero, NumInput, TextInput, Help, Banner, Btn, Label } from "./ui.jsx";

// Templates live as static assets so a new contract version is a file swap.
async function loadTemplate(file) {
  const res = await fetch(`/templates/${file}`);
  if (!res.ok) throw new Error(`Could not load template ${file} (${res.status})`);
  return new Uint8Array(await res.arrayBuffer());
}

function download(bytes, name) {
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export default function DocumentGenerator({ inp, c, doc, setDoc, onExposeApi }) {
  const [selected, setSelected] = useState(["deed"]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [showManifest, setShowManifest] = useState(false);
  const [forcedManifest, setForcedManifest] = useState(null);
  const addrEdited = useRef(false);

  const setField = (k) => (v) => setDoc((prev) => ({ ...prev, [k]: v }));

  // Keep the composed legal address in step with its parts until edited by hand.
  useEffect(() => {
    if (addrEdited.current) return;
    const composed = composeAddress(doc);
    if (composed && composed !== doc.property_address) {
      setDoc((prev) => ({ ...prev, property_address: composed }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.ls_sectional, doc.ls_unit_no, doc.ls_section_no, doc.ls_ss_name, doc.ls_ss_no,
    doc.ls_erf, doc.ls_street_no, doc.ls_street_name, doc.ls_suburb, doc.ls_city, doc.ls_municipality]);

  // Balance is always price − deposit.
  const balance = useMemo(() => {
    const p = toNum(doc.price_amount);
    const d = toNum(doc.deposit_amount) || 0;
    return p === null ? null : p - d;
  }, [doc.price_amount, doc.deposit_amount]);

  const manifest = useMemo(() => validateDocs(doc, selected), [doc, selected]);

  const fileBase = useMemo(() => dealFilename(
    "OTP", doc.seller_name_1 || inp.clientName,
    doc.ls_street_no, doc.ls_street_name,
    doc.ls_suburb || doc.ls_city
  ), [doc.seller_name_1, doc.ls_street_no, doc.ls_street_name, doc.ls_suburb, doc.ls_city, inp.clientName]);

  function toggleDoc(k) {
    setSelected((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k].sort(
      (a, b) => DOC_TYPES.findIndex((t) => t.key === a) - DOC_TYPES.findIndex((t) => t.key === b))));
  }

  async function generate(force) {
    const m = validateDocs(doc, selected);
    setForcedManifest(m);
    if (!force && !m.ok) {
      setShowManifest(true);
      setMsg({ tone: "neg", text: `Blocked — ${m.missing.length} required field(s) missing. Fix them, or use "Generate anyway".` });
      return null;
    }
    if (!selected.length) {
      setMsg({ tone: "warn", text: "Pick at least one document." });
      return null;
    }
    setBusy(true);
    setMsg(null);
    try {
      const PDFLib = await import("pdf-lib");
      const payload = {
        ...doc,
        price_amount: round5000(doc.price_amount),
        deposit_amount: doc.deposit_amount ? round5000(doc.deposit_amount) : "",
      };
      const fns = { deed: fillDeed, A: fillAddA, B: fillAddB };
      const written = [];
      for (const key of selected) {
        const t = DOC_TYPES.find((x) => x.key === key);
        const bytes = await loadTemplate(t.file);
        const out = await fns[key](PDFLib, bytes, payload);
        const name = `${fileBase} - ${t.label}.pdf`;
        download(out, name);
        written.push(name);
      }
      setMsg({
        tone: m.ok ? "pos" : "warn",
        text: m.ok
          ? `Generated ${written.length} document${written.length === 1 ? "" : "s"}.`
          : `Generated with ${m.missing.length} field(s) left blank.`,
      });
      return written;
    } catch (e) {
      setMsg({ tone: "neg", text: `Generation failed: ${e.message}` });
      return null;
    } finally {
      setBusy(false);
    }
  }

  // ── Headless API for Hermes ────────────────────────────────────
  useEffect(() => {
    const api = {
      getDeal: () => ({ ...doc }),
      getField: (k) => doc[k],
      setField: (k, v) => setDoc((prev) => ({ ...prev, [k]: v })),
      setFields: (obj) => setDoc((prev) => ({ ...prev, ...obj })),
      selectDocuments: (arr) => setSelected(arr),
      validate: () => validateDocs(doc, selected),
      generate: () => generate(false),
      generateAnyway: () => generate(true),
      filenameBase: () => fileBase,
      fields: DOC_KEYS,
      get lastValidation() { return manifest; },
    };
    onExposeApi && onExposeApi(api);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, selected, fileBase, manifest]);

  const renderField = ([k, label, type, opts]) => {
    const ro = opts && opts.ro;
    const required = (DOC_FIELD[k].req || []).some((d) => selected.includes(d));
    const isMissing = required && !String(doc[k] ?? "").trim();
    const lbl = `${label}${required ? " *" : ""}`;

    if (k === "finance_amount") {
      return <Row key={k} l="Balance (price − deposit)" v={balance === null ? "—" : R(balance)} strong tone="gold" />;
    }
    if (type === "select") {
      return (
        <div className="ns-field" key={k}>
          <Label>{lbl}</Label>
          <div className="ns-seg">
            {["No", "Yes"].map((o) => (
              <button key={o} type="button"
                className={`ns-seg-btn${(doc[k] || "No") === o ? " on" : ""}`}
                onClick={() => setField(k)(o)}>{o}</button>
            ))}
          </div>
        </div>
      );
    }
    if (type === "textarea") {
      return (
        <div className="ns-field" key={k}>
          <Label>{lbl}</Label>
          <textarea className="ns-textarea" rows={3} value={doc[k] || ""}
            style={isMissing ? { borderColor: "var(--neg)" } : undefined}
            onChange={(e) => {
              if (k === "property_address") addrEdited.current = true;
              setField(k)(e.target.value);
            }} />
        </div>
      );
    }
    const money = ["price_amount", "deposit_amount", "balloon_amt", "bond_amount", "occupation_rent", "instalment"].includes(k);
    if (money) {
      return (
        <div key={k} style={isMissing ? { outline: "1px solid var(--neg)", borderRadius: 10, padding: 1 } : undefined}>
          <NumInput label={lbl} value={toNum(doc[k]) ?? 0} onChange={(v) => setField(k)(String(v))}
            step={k === "price_amount" ? 5000 : 500} min={0} />
        </div>
      );
    }
    return (
      <div key={k} style={isMissing ? { outline: "1px solid var(--neg)", borderRadius: 10, padding: 1 } : undefined}>
        <TextInput label={lbl} value={doc[k] || ""} onChange={setField(k)} readOnly={ro} />
      </div>
    );
  };

  return (
    <>
      {!manifest.ok && (
        <Banner tone="warn">
          {manifest.missing.length} required field{manifest.missing.length === 1 ? "" : "s"} still missing for{" "}
          {selected.map((s) => DOC_TYPES.find((t) => t.key === s)?.label).join(", ")}. They're outlined in red below.
        </Banner>
      )}
      {msg && <Banner tone={msg.tone}>{msg.text}</Banner>}

      <Card full title="Generate" accent="gold">
        <Note>Pick the documents to produce. Numbers come across from the calculator; parties and property are captured here.</Note>
        <div className="ns-seg" style={{ marginBottom: 16 }}>
          {DOC_TYPES.map((t) => (
            <button key={t.key} type="button"
              className={`ns-seg-btn${selected.includes(t.key) ? " on" : ""}`}
              onClick={() => toggleDoc(t.key)}>{t.label}</button>
          ))}
        </div>

        <Row l="Filename base" v={fileBase || "—"} sub="OTP-{seller} - {street}, {suburb} - {document}.pdf" />
        <Row l="Required fields outstanding" v={manifest.missing.length}
          tone={manifest.ok ? "pos" : "neg"} strong />

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
          <Btn kind="gold" onClick={() => generate(false)} disabled={busy || !selected.length}>
            {busy ? "Generating…" : "Generate documents"}
          </Btn>
          <Btn kind="ghost" onClick={() => generate(true)} disabled={busy || !selected.length}>
            Generate anyway
          </Btn>
          <Btn kind="ghost" onClick={() => setShowManifest((s) => !s)}>
            {showManifest ? "Hide" : "Show"} agent manifest
          </Btn>
        </div>

        {showManifest && (
          <pre style={{
            background: "var(--shade)", border: "1px solid var(--line)", borderRadius: 10,
            padding: 14, marginTop: 14, fontSize: 11.5, overflowX: "auto", color: "var(--ink)",
          }}>
            {JSON.stringify(forcedManifest || manifest, null, 2)}
          </pre>
        )}
      </Card>

      <Grid>
        {DOC_SECTIONS.map((s) => (
          <Card key={s.id} n={s.n} title={s.title} wide={s.id === "dates"}>
            {s.id === "property" && <Note>Fill these from the LightStone report — the legal address below composes itself.</Note>}
            {s.id === "numbers" && (
              <Note>Pulled from the {inp.preferredMethod === "isa" ? "installment" : "cash"} structure. Price rounds to the nearest R5 000.</Note>
            )}
            {s.fields.map(renderField)}
          </Card>
        ))}
      </Grid>

      <Card full title="Re-pull From Calculator" accent="sage">
        <Note>
          Overwrites seller, property and the numbers with the current calculator values. Anything you typed by hand in
          those fields is replaced — the rest is left alone.
        </Note>
        <Btn kind="ghost" onClick={() => {
          addrEdited.current = false;
          setDoc((prev) => ({ ...prev, ...seedDocFromDeal(inp, c) }));
          setMsg({ tone: "pos", text: "Re-pulled from the calculator." });
        }}>
          Re-pull deal values
        </Btn>
      </Card>
    </>
  );
}
