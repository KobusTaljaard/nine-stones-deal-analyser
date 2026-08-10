import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { Card, Note, Banner, Btn } from "./ui.jsx";

function fmtDate(iso) {
  return new Date(iso).toLocaleString("en-ZA", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
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

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    if (pendingBlob?.url) URL.revokeObjectURL(pendingBlob.url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startRecording() {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setMicUnsupported(true); return;
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
        setPendingBlob({ blob, url: URL.createObjectURL(blob), name: `voice-note-${Date.now()}.webm`, type: blob.type });
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      setRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } catch {
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
    let voiceNoteUrl = null, voiceNoteName = null;

    if (pendingBlob) {
      setUploading(true);
      const ext = pendingBlob.name.includes(".") ? pendingBlob.name.split(".").pop() : "webm";
      const path = `${dealId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("voice-notes")
        .upload(path, pendingBlob.blob, { contentType: pendingBlob.type || "audio/webm", upsert: false });
      setUploading(false);
      if (upErr) { setError(`Voice note upload failed: ${upErr.message}. Nothing was saved — try again.`); return; }
      const { data } = supabase.storage.from("voice-notes").getPublicUrl(path);
      voiceNoteUrl = data.publicUrl;
      voiceNoteName = pendingBlob.name;
    }

    onChange([{
      id: (crypto.randomUUID && crypto.randomUUID()) || String(Date.now()),
      timestamp: new Date().toISOString(),
      text: text.trim(), voiceNoteUrl, voiceNoteName,
    }, ...log]);
    setText("");
    discardPending();
  }

  function deleteEntry(id) {
    if (!window.confirm("Delete this note? This can't be undone.")) return;
    onChange(log.filter((e) => e.id !== id));
  }

  return (
    <Card full n="03" title="Conversation Log">
      <Note>
        Log each round with the seller as it happens — price corrections, motivated and walk-away figures, anything that
        changes the deal. Attach a voice note if it's easier to talk it out.
      </Note>

      {error && <Banner tone="neg">{error}</Banner>}
      {micUnsupported && <Banner tone="warn">In-browser recording isn't supported here. Upload an audio file instead.</Banner>}

      <textarea className="ns-textarea" rows={3} value={text} onChange={(e) => setText(e.target.value)}
        placeholder="e.g. Spoke to the seller — real asking is R430k not R43m. They'll take R300k, or R140k to walk away…" />

      {pendingBlob && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
          <audio controls src={pendingBlob.url} className="ns-audio" style={{ flex: 1 }} />
          <button className="ns-icon-btn" onClick={discardPending}>✕</button>
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "12px 0 16px" }}>
        {!recording
          ? <Btn kind="ghost" onClick={startRecording}>Record voice note</Btn>
          : <Btn kind="danger" onClick={stopRecording}>Stop — {fmtSecs(elapsed)}</Btn>}
        <Btn kind="ghost" onClick={() => fileInputRef.current?.click()}>Upload audio</Btn>
        <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleFileSelect} style={{ display: "none" }} />
        <div style={{ marginLeft: "auto" }}>
          <Btn kind="primary" onClick={saveNote} disabled={uploading || (!text.trim() && !pendingBlob)}>
            {uploading ? "Saving…" : "Save note"}
          </Btn>
        </div>
      </div>

      {log.length === 0
        ? <div className="ns-empty" style={{ padding: 24 }}>No conversation logged yet.</div>
        : log.map((entry) => (
          <div key={entry.id} className="ns-log-entry">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div className="ns-log-date">{fmtDate(entry.timestamp)}</div>
              <button className="ns-icon-btn" onClick={() => deleteEntry(entry.id)}>Delete</button>
            </div>
            {entry.text && <div className="ns-log-text">{entry.text}</div>}
            {entry.voiceNoteUrl && <audio controls src={entry.voiceNoteUrl} className="ns-audio" />}
          </div>
        ))}
    </Card>
  );
}
