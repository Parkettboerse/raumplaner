"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";

interface ImageUploadProps {
  onImageUploaded: (base64: string) => void;
}

const MAX_SIZE = 20 * 1024 * 1024;
const MAX_WIDTH = 1024;
const JPEG_QUALITY = 0.5;

function compressImage(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { naturalWidth: w, naturalHeight: h } = img;
      if (w > MAX_WIDTH) { h = Math.round(h * (MAX_WIDTH / w)); w = MAX_WIDTH; }
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      const ctx = c.getContext("2d");
      if (!ctx) { reject(new Error("Canvas error")); return; }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL("image/jpeg", JPEG_QUALITY));
    };
    img.onerror = () => reject(new Error("Bild konnte nicht geladen werden"));
    img.src = src;
  });
}

export default function ImageUpload({ onImageUploaded }: ImageUploadProps) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [processingText, setProcessingText] = useState("Bild wird verarbeitet...");
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function processFile(file: File) {
    setError("");
    if (file.size > MAX_SIZE) { setError("Maximal 20 MB erlaubt."); return; }

    const isHeic = file.type === "image/heic" || file.type === "image/heif" ||
      file.name.toLowerCase().endsWith(".heic") || file.name.toLowerCase().endsWith(".heif");
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!isHeic && !allowed.includes(file.type)) { setError("Bitte JPG, PNG oder HEIC verwenden."); return; }

    setProcessing(true);

    if (isHeic) {
      setProcessingText("HEIC wird konvertiert...");
      try {
        const fd = new FormData(); fd.append("file", file);
        const res = await fetch("/api/convert-heic", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok || !data.image) { setError(data.error || "HEIC fehlgeschlagen."); setProcessing(false); return; }
        setProcessingText("Wird komprimiert...");
        setPreview(await compressImage(data.image)); setProcessing(false);
      } catch { setError("HEIC fehlgeschlagen."); setProcessing(false); }
      return;
    }

    setProcessingText("Wird komprimiert...");
    const reader = new FileReader();
    reader.onload = async () => {
      try { setPreview(await compressImage(reader.result as string)); }
      catch { setError("Fehler beim Verarbeiten."); }
      setProcessing(false);
    };
    reader.onerror = () => { setError("Fehler beim Lesen."); setProcessing(false); };
    reader.readAsDataURL(file);
  }

  if (preview) {
    return (
      <div className="flex flex-col items-center gap-6">
        <div className="relative w-full overflow-hidden rounded-2xl shadow-md">
          <img src={preview} alt="Raumfoto" className="w-full object-contain" />
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/60 to-transparent px-5 pb-4 pt-12">
            <span className="text-sm font-medium text-white/90">Foto bereit</span>
            <button onClick={() => { setPreview(null); setError(""); }} className="rounded-lg bg-white/15 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm hover:bg-white/25">Anderes Foto</button>
          </div>
        </div>
        <button onClick={() => onImageUploaded(preview)} className="w-full rounded-xl py-3.5 text-center text-sm font-semibold text-white transition-all hover:opacity-90" style={{ backgroundColor: "var(--oak)" }}>
          Weiter — Boden auswählen
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <div
        role="button" tabIndex={0}
        onDragOver={(e: DragEvent) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={(e: DragEvent) => { e.preventDefault(); setDragging(false); }}
        onDrop={(e: DragEvent) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) processFile(f); }}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click(); }}
        aria-label="Raumfoto hochladen"
        className="upload-zone relative cursor-pointer rounded-2xl border border-dashed p-10 text-center transition-all duration-200 sm:p-14"
        style={{
          borderColor: dragging ? "var(--oak)" : "var(--grey-lighter)",
          backgroundColor: dragging ? "var(--oak-pale)" : "var(--white)",
        }}
      >
        <style>{`.upload-zone:hover { border-color: var(--oak) !important; background: var(--oak-pale) !important; }`}</style>
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/heic,.heic" capture="environment" onChange={(e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = ""; }} className="hidden" />

        <div className="flex flex-col items-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl" style={{ backgroundColor: "var(--oak-pale)" }}>
            <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "var(--oak)" }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h2 className="font-display text-2xl font-semibold" style={{ color: "var(--dark)" }}>
            Raumfoto hochladen
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed" style={{ color: "var(--grey)" }}>
            Fotografieren Sie Ihren Raum und sehen Sie, wie verschiedene Bodenbeläge darin wirken.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-1.5">
            {["JPG", "PNG", "HEIC"].map((l) => (
              <span key={l} className="rounded-full px-2.5 py-0.5 text-[11px] font-medium" style={{ backgroundColor: "var(--oak-pale)", color: "var(--grey)" }}>{l}</span>
            ))}
            <span className="text-[11px]" style={{ color: "var(--grey-light)" }}>max. 20 MB</span>
          </div>
          {/* Mobile only */}
          <p className="mt-4 text-xs sm:hidden" style={{ color: "var(--oak)" }}>Tippen um die Kamera zu öffnen</p>
        </div>

        {processing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-white/90 backdrop-blur-sm">
            <div className="mb-3 h-8 w-8 animate-spin rounded-full border-[3px] border-t-transparent" style={{ borderColor: "var(--grey-lighter)", borderTopColor: "var(--oak)" }} />
            <p className="text-sm" style={{ color: "var(--grey)" }}>{processingText}</p>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: "#FEF2F2", color: "#DC2626" }}>{error}</div>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {[
          { title: "Fotorealistisch", text: "KI-Vorschau mit echten Perspektiven" },
          { title: "In Sekunden", text: "Ergebnis sofort und kostenlos testen" },
          { title: "Direkt bestellen", text: "Boden gefällt? Im Shop bestellen" },
        ].map((f) => (
          <div key={f.title} className="rounded-2xl bg-white p-6 text-center" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <p className="text-sm font-semibold" style={{ color: "var(--dark)" }}>{f.title}</p>
            <p className="mt-1 text-xs" style={{ color: "var(--grey)" }}>{f.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
