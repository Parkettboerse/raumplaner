"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";

interface ImageUploadProps { onImageUploaded: (base64: string) => void; }

const MAX_SIZE = 20 * 1024 * 1024;
const MAX_WIDTH = 1024;

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
      resolve(c.toDataURL("image/jpeg", 0.5));
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
    if (!isHeic && !["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setError("Bitte JPG, PNG oder HEIC."); return; }
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
      <div className="flex flex-col gap-5">
        <div className="relative w-full overflow-hidden rounded-2xl shadow-md">
          <img src={preview} alt="Raumfoto" className="w-full object-contain" />
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/60 to-transparent px-5 pb-4 pt-12">
            <span className="text-sm font-medium text-white/90">Foto bereit</span>
            <button onClick={() => { setPreview(null); setError(""); }} className="rounded-full bg-white/20 px-4 py-1.5 text-xs font-medium text-white backdrop-blur-sm hover:bg-white/30">Anderes Foto</button>
          </div>
        </div>
        <button onClick={() => onImageUploaded(preview)} className="w-full rounded-full py-4 text-base font-semibold transition-all hover:opacity-90" style={{ backgroundColor: "var(--gold)", color: "var(--black)" }}>
          Weiter — Boden auswählen
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Headline */}
      <div>
        <h1 className="text-[28px] font-bold leading-tight sm:text-[36px]" style={{ color: "var(--black)" }}>
          Wie soll Ihr neuer<br className="hidden sm:block" /> Boden aussehen?
        </h1>
        <p className="mt-3 text-base leading-relaxed sm:text-lg" style={{ color: "var(--grey)" }}>
          Laden Sie ein Foto Ihres Raums hoch und sehen Sie in Sekunden, wie Ihr Wunschboden darin wirkt.
        </p>
      </div>

      {/* Upload zone */}
      <div
        role="button" tabIndex={0}
        onDragOver={(e: DragEvent) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={(e: DragEvent) => { e.preventDefault(); setDragging(false); }}
        onDrop={(e: DragEvent) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) processFile(f); }}
        onClick={() => fileRef.current?.click()}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileRef.current?.click(); }}
        className="upload-zone relative flex min-h-[280px] cursor-pointer flex-col items-center justify-center rounded-[20px] border-2 border-dashed transition-all duration-200 sm:min-h-[320px]"
        style={{
          borderColor: dragging ? "var(--gold)" : "var(--gold)",
          backgroundColor: dragging ? "var(--gold-pale)" : "var(--white)",
          boxShadow: dragging ? "0 0 0 4px var(--gold-glow)" : "none",
        }}
      >
        <style>{`.upload-zone:hover { background: var(--gold-pale) !important; box-shadow: 0 0 0 4px var(--gold-glow) !important; }`}</style>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/heic,.heic" capture="environment" onChange={(e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = ""; }} className="hidden" />

        <div className="flex h-20 w-20 items-center justify-center rounded-full" style={{ background: "linear-gradient(135deg, #C8A415, #D4B84A)" }}>
          <svg className="h-10 w-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <p className="mt-5 text-xl font-bold" style={{ color: "var(--black)" }}>Foto hochladen</p>
        <p className="mt-1 text-sm" style={{ color: "var(--grey-light)" }}>oder hierher ziehen</p>
        <div className="mt-4 flex items-center gap-2">
          {["JPG", "PNG", "HEIC"].map((l) => (
            <span key={l} className="rounded-full px-2.5 py-0.5 text-[10px] font-medium" style={{ backgroundColor: "var(--grey-bg)", color: "var(--grey-light)" }}>{l}</span>
          ))}
        </div>
        <p className="mt-4 text-xs sm:hidden" style={{ color: "var(--gold)" }}>Tippen um Kamera zu öffnen</p>

        {processing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-[20px] bg-white/90 backdrop-blur-sm">
            <div className="mb-3 h-9 w-9 animate-spin rounded-full border-[3px] border-t-transparent" style={{ borderColor: "var(--grey-border)", borderTopColor: "var(--gold)" }} />
            <p className="text-sm" style={{ color: "var(--grey)" }}>{processingText}</p>
          </div>
        )}
      </div>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

      {/* Subtle process steps */}
      <div className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-8">
        {[
          { icon: "M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z", t: "Foto hochladen" },
          { icon: "M13 10V3L4 14h7v7l9-11h-7z", t: "KI tauscht den Boden" },
          { icon: "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z", t: "Direkt bestellen" },
        ].map((f, i) => (
          <div key={f.t} className="flex items-center gap-2">
            {i > 0 && <span className="hidden text-xs sm:block" style={{ color: "var(--grey-border)" }}>→</span>}
            <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "var(--gold)" }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={f.icon} />
            </svg>
            <span className="text-sm" style={{ color: "var(--grey)" }}>{f.t}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
