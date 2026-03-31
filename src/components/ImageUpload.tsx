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

  // ── Preview after upload ──
  if (preview) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-5">
        <div className="relative w-full overflow-hidden rounded-2xl shadow-lg">
          <img src={preview} alt="Raumfoto" className="w-full object-contain" />
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/60 to-transparent px-5 pb-4 pt-12">
            <span className="text-sm font-medium text-white/90">Foto bereit</span>
            <button onClick={() => { setPreview(null); setError(""); }} className="rounded-full bg-white/20 px-4 py-1.5 text-xs font-medium text-white backdrop-blur-sm hover:bg-white/30">Anderes Foto</button>
          </div>
        </div>
        <button onClick={() => onImageUploaded(preview)} className="w-full rounded-full py-4 text-base font-semibold transition-all hover:scale-[1.01] hover:shadow-lg" style={{ backgroundColor: "var(--gold)", color: "var(--black)" }}>
          Weiter — Boden auswählen
        </button>
      </div>
    );
  }

  // ── Hero + Upload ──
  return (
    <div className="flex flex-col">
      {/* Hero section */}
      <div className="relative overflow-hidden rounded-2xl" style={{ background: "linear-gradient(135deg, #2A2219 0%, #4A3A25 40%, #6B5530 70%, #8B6914 100%)" }}>
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.05) 20px, rgba(255,255,255,0.05) 40px)",
        }} />

        <div className="relative px-6 pb-8 pt-10 sm:px-10 sm:pb-10 sm:pt-14">
          <h1 className="text-2xl font-bold leading-tight text-white sm:text-[32px] sm:leading-tight">
            Wie soll Ihr neuer<br />Boden aussehen?
          </h1>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/70 sm:text-base">
            Laden Sie ein Foto Ihres Raums hoch und unsere KI zeigt Ihnen in Sekunden, wie Ihr Wunschboden darin aussieht.
          </p>

          {/* Upload drop zone floating on hero */}
          <div
            role="button" tabIndex={0}
            onDragOver={(e: DragEvent) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={(e: DragEvent) => { e.preventDefault(); setDragging(false); }}
            onDrop={(e: DragEvent) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) processFile(f); }}
            onClick={() => fileRef.current?.click()}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileRef.current?.click(); }}
            className="upload-zone group relative mt-8 cursor-pointer rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-all duration-300 sm:px-10 sm:py-12"
            style={{
              borderColor: dragging ? "var(--gold)" : "rgba(255,255,255,0.3)",
              backgroundColor: dragging ? "rgba(200,164,21,0.15)" : "rgba(255,255,255,0.08)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              transform: dragging ? "scale(1.01)" : undefined,
              boxShadow: dragging ? "0 0 30px rgba(200,164,21,0.2)" : undefined,
            }}
          >
            <style>{`
              .upload-zone:hover { border-color: var(--gold) !important; background: rgba(200,164,21,0.12) !important; transform: scale(1.01); box-shadow: 0 0 30px rgba(200,164,21,0.15); }
              @keyframes pulse-ring { 0% { transform: scale(1); opacity: 0.6; } 100% { transform: scale(1.4); opacity: 0; } }
            `}</style>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/heic,.heic" capture="environment" onChange={(e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = ""; }} className="hidden" />

            <div className="flex flex-col items-center">
              {/* Animated icon */}
              <div className="relative mb-5">
                <div className="absolute inset-0 rounded-full" style={{ backgroundColor: "var(--gold)", animation: "pulse-ring 2s ease-out infinite" }} />
                <div className="relative flex h-14 w-14 items-center justify-center rounded-full" style={{ background: "linear-gradient(135deg, #C8A415, #D4B84A)" }}>
                  <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-lg font-semibold text-white sm:text-xl">Foto hochladen</p>
              <p className="mt-1.5 text-sm text-white/50">oder hierher ziehen</p>
              <div className="mt-4 flex items-center gap-2">
                {["JPG", "PNG", "HEIC"].map((l) => (
                  <span key={l} className="rounded-full border border-white/20 px-2.5 py-0.5 text-[10px] font-medium text-white/50">{l}</span>
                ))}
                <span className="text-[10px] text-white/30">max 20 MB</span>
              </div>
              <p className="mt-3 text-xs text-white/40 sm:hidden">Tippen um Kamera zu öffnen</p>
            </div>

            {processing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-black/60 backdrop-blur-sm">
                <div className="mb-3 h-9 w-9 animate-spin rounded-full border-[3px] border-t-transparent" style={{ borderColor: "rgba(255,255,255,0.2)", borderTopColor: "var(--gold)" }} />
                <p className="text-sm text-white/80">{processingText}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

      {/* Feature strip */}
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        {[
          { icon: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z", t: "Fotorealistisch", d: "KI-Vorschau mit echten Perspektiven" },
          { icon: "M13 10V3L4 14h7v7l9-11h-7z", t: "In Sekunden", d: "Ergebnis sofort testen" },
          { icon: "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z", t: "Direkt bestellen", d: "Boden gefällt? Im Shop bestellen" },
        ].map((f, i) => (
          <div key={f.t} className="flex items-center gap-3 rounded-xl bg-white p-4 transition-all hover:-translate-y-0.5 animate-fadeIn" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)", animationDelay: `${i * 0.1}s`, animationFillMode: "both" }}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: "var(--gold-pale)" }}>
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "var(--gold)" }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={f.icon} />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--black)" }}>{f.t}</p>
              <p className="text-xs" style={{ color: "var(--grey)" }}>{f.d}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
