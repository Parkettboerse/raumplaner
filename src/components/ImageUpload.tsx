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
      <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 sm:px-0">
        <div className="relative w-full overflow-hidden rounded-lg">
          <img src={preview} alt="Raumfoto" className="w-full object-contain" />
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/50 to-transparent px-4 pb-3 pt-10">
            <span className="text-sm text-white/80">Foto bereit</span>
            <button onClick={() => { setPreview(null); setError(""); }} className="rounded-md bg-white/20 px-3 py-1 text-xs text-white backdrop-blur-sm hover:bg-white/30">Anderes Foto</button>
          </div>
        </div>
        <button onClick={() => onImageUploaded(preview)} className="w-full rounded-lg py-3 text-sm font-semibold text-white" style={{ backgroundColor: "var(--black)" }}>
          Weiter — Boden auswählen
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-4 sm:px-0">
      <div
        role="button" tabIndex={0}
        onDragOver={(e: DragEvent) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={(e: DragEvent) => { e.preventDefault(); setDragging(false); }}
        onDrop={(e: DragEvent) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) processFile(f); }}
        onClick={() => fileRef.current?.click()}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileRef.current?.click(); }}
        className="upload-zone relative cursor-pointer rounded-lg border border-dashed p-8 text-center transition-all sm:p-12"
        style={{ borderColor: dragging ? "var(--gold)" : "var(--grey-border)", backgroundColor: dragging ? "var(--gold-pale)" : "var(--white)" }}
      >
        <style>{`.upload-zone:hover { border-color: var(--gold) !important; background: var(--gold-pale) !important; }`}</style>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/heic,.heic" capture="environment" onChange={(e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = ""; }} className="hidden" />

        <div className="flex flex-col items-center">
          <svg className="mb-5 h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "var(--gold)" }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <h2 className="text-xl font-bold sm:text-[22px]" style={{ color: "var(--black)" }}>Foto von Ihrem Raum hochladen</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed" style={{ color: "var(--grey)" }}>
            Machen Sie ein Foto und sehen Sie sofort, wie Ihr neuer Boden aussieht.
          </p>
          <div className="mt-4 flex items-center gap-2">
            {["JPG", "PNG", "HEIC"].map((l) => (
              <span key={l} className="rounded px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: "var(--grey-bg)", color: "var(--grey-light)" }}>{l}</span>
            ))}
            <span className="text-[10px]" style={{ color: "var(--grey-light)" }}>max 20 MB</span>
          </div>
          <p className="mt-4 text-xs sm:hidden" style={{ color: "var(--gold)" }}>Tippen um Kamera zu öffnen</p>
        </div>

        {processing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg bg-white/90">
            <div className="mb-2 h-7 w-7 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: "var(--grey-border)", borderTopColor: "var(--gold)" }} />
            <p className="text-sm" style={{ color: "var(--grey)" }}>{processingText}</p>
          </div>
        )}
      </div>

      {error && <p className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { t: "Fotorealistisch", d: "KI-Vorschau mit echten Perspektiven" },
          { t: "In Sekunden", d: "Ergebnis sofort testen" },
          { t: "Direkt bestellen", d: "Boden gefällt? Im Shop bestellen" },
        ].map((f) => (
          <div key={f.t} className="rounded-lg border p-4 text-center" style={{ borderColor: "var(--grey-border)" }}>
            <p className="text-sm font-semibold" style={{ color: "var(--black)" }}>{f.t}</p>
            <p className="mt-0.5 text-xs" style={{ color: "var(--grey)" }}>{f.d}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
