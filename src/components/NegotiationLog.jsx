import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { C } from "../lib/calc.js";
import { Sec, Card } from "./ui.jsx";

function fmtDate(iso) {
  return new Date(iso).toLocaleString("en-ZA", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function fmtSecs(s) {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const sec = Math.floor(s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

export default function NegotiationLog({ dealId, log, onChange }) {
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [pendingBlob, setPendingBlob] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [micUnsupported, setMicUnsupported] = useState(false);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      if (pendingBlob?.url) URL.revokeObjectURL(pendingBlob.url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startRecording() {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setMicUnsupported(true);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        const url = URL.createObjectURL(blob);
        setPendingBlob({ blob, url, name: `voice-note-${Date.now()}.webm`, type: blob.type });
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      setRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } catch (e) {
      setError("Couldn't access the microphone — check browser permissions, or upload an audio file instead.");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (pendingBlob?.url) URL.revokeObjectURL(pendingBlob.url);
    setPendingBlob({ blob: file, url: URL.createObjectURL(file), name: file.name, type: file.type });
  }

  function discardPending() {
    if (pendingBlob?.url) URL.revokeObjectURL(pendingBlob.url);
    setPendingBlob(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function saveNote() {
    if (!text.trim() && !pendingBlob) return;
    setError(null);
    let voiceNoteUrl = null;
    let voiceNoteName = null;

    if (pendingBlob) {
      setUploading(true);
      const ext = pendingBlob.name.includes(".") ? pendingBlob.name.split(".").pop() : "webm";
      const path = `${dealId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("voice-notes").upload(path, pendingBlob.blob, {
        contentType: pendingBlob.type || "audio/webm",
        upsert: false,
      });
      setUploading(false);
      if (upErr) {
        setError(`Voice note upload failed: ${upErr.message}. Note text was not saved either — try again.`);
        return;
      }
      const { data } = supabase.storage.from("voice-notes").getPublicUrl(path);
      voiceNoteUrl = data.publicUrl;
      voiceNoteName = pendingBlob.name;
    }

    const entry = {
      id: (crypto.randomUUID && crypto.randomUUID()) || String(Date.now()),
      timestamp: new Date().toISOString(),
      text: text.trim(),
      voiceNoteUrl,
      voiceNoteName,
    };
    onChange([entry, ...log]);
    setText("");
    discardPending();
  }

  function deleteEntry(id) {
    if (!window.confirm("Delete this note? This can't be undone.")) return;
    onChange(log.filter((e) => e.id !== id));
  }

  return (
    <Card>
      <Sec>Conversation Log</Sec>
      <div style={{ fontSize: 12, color: C.sub, marginBottom: 14, lineHeight: 1.5 }}>
        Log each round of conversation with the seller as it happens — asking price corrections, motivated/walk-away figures, anything that changes the deal. Attach a voice note if it's easier to talk it out than type it.
      </div>

      {error && (
        <div style={{ background: "rgba(239,68,68,0.1)", border: `1px solid ${C.red}`, borderRadius: 8, padding: "10px 12px", marginBottom: 12, fontSize: 12, color: C.red }}>
          {error}
        </div>
      )}
      {micUnsupported && (
        <div style={{ background: "rgba(245,158,11,0.1)", border: `1px solid ${C.amber}`, borderRadius: 8, padding: "10px 12px", marginBottom: 12, fontSize: 12, color: C.amber }}>
          In-browser recording isn't supported here. Upload an audio file instead (e.g. a voice memo from your phone).
        </div>
      )}

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="e.g. Spoke to Liliana — real price is R430k not R43m (typo). She'll take R300k, or R140k just to walk away once she understood the eviction process…"
        rows={3}
        style={{ width: "100%", background: "#141C2E", border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 13, fontFamily: "inherit", resize: "vertical", marginBottom: 10, outline: "none" }}
      />

      {pendingBlob && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 10px", marginBottom: 10 }}>
          <audio controls src={pendingBlob.url} style={{ height: 32, flex: 1, minWidth: 0 }} />
          <button onClick={discardPending} style={{ background: "none", border: "none", color: C.sub, cursor: "pointer", fontSize: 13 }}>✕</button>
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        {!recording ? (
          <button
            onClick={startRecording}
            style={{ background: "#141C2E", border: `1px solid ${C.border}`, color: C.text, borderRadius: 8, padding: "9px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
          >
            🎙 Record voice note
          </button>
        ) : (
          <button
            onClick={stopRecording}
            style={{ background: "rgba(239,68,68,0.15)", border: `1px solid ${C.red}`, color: C.red, borderRadius: 8, padding: "9px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}
          >
            ⏹ Stop — {fmtSecs(elapsed)}
          </button>
        )}
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{ background: "#141C2E", border: `1px solid ${C.border}`, color: C.text, borderRadius: 8, padding: "9px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
        >
          📎 Upload audio file
        </button>
        <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleFileSelect} style={{ display: "none" }} />

        <button
          onClick={saveNote}
          disabled={uploading || (!text.trim() && !pendingBlob)}
          style={{ marginLeft: "auto", background: C.blue, border: "none", color: "#fff", borderRadius: 8, padding: "9px 16px", fontSize: 12.5, fontWeight: 700, cursor: uploading ? "default" : "pointer", opacity: uploading || (!text.trim() && !pendingBlob) ? 0.5 : 1 }}
        >
          {uploading ? "Saving…" : "Save Note"}
        </button>
      </div>

      {log.length === 0 ? (
        <div style={{ fontSize: 12, color: C.sub, textAlign: "center", padding: "16px 0" }}>No conversation logged yet.</div>
      ) : (
        log.map((entry) => (
          <div key={entry.id} style={{ background: C.bg, borderRadius: 8, padding: "10px 12px", marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: entry.text || entry.voiceNoteUrl ? 6 : 0 }}>
              <div style={{ fontSize: 10.5, color: C.sub, fontWeight: 700, letterSpacing: "0.3px" }}>{fmtDate(entry.timestamp)}</div>
              <button onClick={() => deleteEntry(entry.id)} style={{ background: "none", border: "none", color: C.sub, cursor: "pointer", fontSize: 12 }}>🗑</button>
            </div>
            {entry.text && <div style={{ fontSize: 13, color: C.text, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{entry.text}</div>}
            {entry.voiceNoteUrl && (
              <audio controls src={entry.voiceNoteUrl} style={{ width: "100%", height: 32, marginTop: 8 }} />
            )}
          </div>
        ))
      )}
    </Card>
  );
}
