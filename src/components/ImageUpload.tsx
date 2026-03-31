"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";

interface ImageUploadProps { onImageUploaded: (base64: string) => void; }

const MAX_SIZE = 20 * 1024 * 1024;
const MAX_WIDTH = 1024;
const JPEG_QUALITY = 0.5;

function compressImage(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { naturalWidth: w, naturalHeight: h } = img;
      if (w > MAX_WIDTH) { h = Math.round(h * (MAX_WIDTH / w)); w = MAX_WIDTH; }
      const c = document.createElement("canvas"); c.width = w; c.height = h;
      const ctx = c.getContext("2d");
      if (!ctx) { reject(new Error("Canvas")); return; }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL("image/jpeg", JPEG_QUALITY));
    };
    img.onerror = () => reject(new Error("Load failed"));
    img.src = src;
  });
}

export default function ImageUpload({ onImageUploaded }: ImageUploadProps) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [processingText, setProcessingText] = useState("Wird verarbeitet...");
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function processFile(file: File) {
    setError("");
    if (file.size > MAX_SIZE) { setError("Maximal 20 MB."); return; }
    const isHeic = file.type === "image/heic" || file.type === "image/heif" || file.name.toLowerCase().endsWith(".heic");
    const ok = ["image/jpeg", "image/png", "image/webp"];
    if (!isHeic && !ok.includes(file.type)) { setError("Bitte JPG, PNG oder HEIC."); return; }
    setProcessing(true);
    if (isHeic) {
      setProcessingText("HEIC wird konvertiert...");
      try {
        const fd = new FormData(); fd.append("file", file);
        const res = await fetch("/api/convert-heic", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok || !data.image) { setError("HEIC fehlgeschlagen."); setProcessing(false); return; }
        setPreview(await compressImage(data.image)); setProcessing(false);
      } catch { setError("HEIC fehlgeschlagen."); setProcessing(false); }
      return;
    }
    setProcessingText("Wird komprimiert...");
    const reader = new FileReader();
    reader.onload = async () => { try { setPreview(await compressImage(reader.result as string)); } catch { setError("Fehler."); } setProcessing(false); };
    reader.onerror = () => { setError("Lesefehler."); setProcessing(false); };
    reader.readAsDataURL(file);
  }

  if (preview) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-5 px-4 sm:px-0">
        <div className="relative w-full overflow-hidden rounded-2xl shadow-md">
          <img src={preview} alt="Raumfoto" className="w-full object-contain" />
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/60 to-transparent px-5 pb-4 pt-12">
            <span className="text-sm font-medium text-white/90">Foto bereit</span>
            <button onClick={() => { setPreview(null); setError(""); }} className="rounded-lg bg-white/20 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm hover:bg-white/30">Anderes Foto</button>
          </div>
        </div>
        <button onClick={() => onImageUploaded(preview)} className="w-full rounded-xl py-3.5 text-sm font-semibold text-white transition-all hover:opacity-90" style={{ backgroundColor: "var(--black)" }}>
          Weiter — Boden auswählen
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-10 px-4 sm:px-0">
      <div
        role="button" tabIndex={0}
        onDragOver={(e: DragEvent) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={(e: DragEvent) => { e.preventDefault(); setDragging(false); }}
        onDrop={(e: DragEvent) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) processFile(f); }}
        onClick={() => fileRef.current?.click()}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileRef.current?.click(); }}
        className="upload-zone relative cursor-pointer rounded-2xl border-2 border-dashed px-8 py-14 text-center transition-all duration-200 sm:px-10 sm:py-16"
        style={{
          borderColor: dragging ? "var(--gold)" : "rgba(200,164,21,0.4)",
          background: dragging
            ? "linear-gradient(135deg, rgba(200,164,21,0.08), rgba(200,164,21,0.12))"
            : "linear-gradient(135deg, rgba(200,164,21,0.03), rgba(200,164,21,0.06))",
          transform: dragging ? "translateY(-2px)" : undefined,
          boxShadow: dragging ? "0 8px 24px rgba(200,164,21,0.15)" : undefined,
        }}
      >
        <style>{`
          .upload-zone:hover {
            border-color: var(--gold) !important;
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(200,164,21,0.15);
          }
        `}</style>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/heic,.heic" capture="environment" onChange={(e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = ""; }} className="hidden" />

        <div className="flex flex-col items-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full shadow-md" style={{ background: "linear-gradient(135deg, #C8A415, #D4B84A)" }}>
            <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold" style={{ color: "var(--black)" }}>Foto von Ihrem Raum hochladen</h2>
          <p className="mx-auto mt-2.5 max-w-md text-sm leading-relaxed" style={{ color: "var(--grey)" }}>
            Machen Sie ein Foto und sehen Sie sofort, wie Ihr neuer Boden aussieht.
          </p>
          <div className="mt-5 flex items-center gap-2">
            {["JPG", "PNG", "HEIC"].map((l) => (
              <span key={l} className="rounded-full border bg-white px-3 py-1 text-[11px] font-medium" style={{ borderColor: "var(--grey-border)", color: "var(--grey)" }}>{l}</span>
            ))}
            <span className="text-[11px]" style={{ color: "var(--grey-light)" }}>max 20 MB</span>
          </div>
          <p className="mt-5 text-xs sm:hidden" style={{ color: "var(--gold)" }}>Tippen um Kamera zu öffnen</p>
        </div>

        {processing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-white/90 backdrop-blur-sm">
            <div className="mb-3 h-9 w-9 animate-spin rounded-full border-[3px] border-t-transparent" style={{ borderColor: "var(--grey-border)", borderTopColor: "var(--gold)" }} />
            <p className="text-sm" style={{ color: "var(--grey)" }}>{processingText}</p>
          </div>
        )}
      </div>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { icon: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z", t: "Fotorealistisch", d: "KI-Vorschau mit echten Perspektiven" },
          { icon: "M13 10V3L4 14h7v7l9-11h-7z", t: "In Sekunden", d: "Ergebnis sofort testen" },
          { icon: "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z", t: "Direkt bestellen", d: "Boden gefällt? Im Shop bestellen" },
        ].map((f) => (
          <div key={f.t} className="group rounded-[14px] bg-white p-5 text-center transition-all hover:-translate-y-0.5" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: "var(--gold-pale)" }}>
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "var(--gold)" }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={f.icon} />
              </svg>
            </div>
            <p className="text-sm font-semibold" style={{ color: "var(--black)" }}>{f.t}</p>
            <p className="mt-1 text-xs" style={{ color: "var(--grey)" }}>{f.d}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
