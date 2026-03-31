"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";

interface ImageUploadProps {
  onImageUploaded: (base64: string) => void;
}

const MAX_SIZE = 20 * 1024 * 1024; // 20 MB

const FEATURES = [
  {
    icon: "\uD83C\uDFAF",
    title: "Realistisch",
    text: "KI-generierte Vorschau mit echten Perspektiven",
  },
  {
    icon: "\u26A1",
    title: "Schnell",
    text: "Ergebnis in wenigen Sekunden — kostenlos",
  },
  {
    icon: "\uD83D\uDED2",
    title: "Direkt bestellen",
    text: "Gefällt der Boden? Direkt im Shop bestellen",
  },
];

const MAX_WIDTH = 1920;
const JPEG_QUALITY = 0.7;

function compressImage(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { naturalWidth: w, naturalHeight: h } = img;
      if (w > MAX_WIDTH) {
        h = Math.round(h * (MAX_WIDTH / w));
        w = MAX_WIDTH;
      }
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas nicht verfügbar"));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
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

    if (file.size > MAX_SIZE) {
      setError("Die Datei ist zu groß. Maximal 20 MB erlaubt.");
      return;
    }

    const isHeic =
      file.type === "image/heic" ||
      file.type === "image/heif" ||
      file.name.toLowerCase().endsWith(".heic") ||
      file.name.toLowerCase().endsWith(".heif");

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!isHeic && !allowedTypes.includes(file.type)) {
      setError("Nicht unterstütztes Format. Bitte JPG, PNG oder HEIC verwenden.");
      return;
    }

    setProcessing(true);

    // HEIC: convert server-side, then compress client-side
    if (isHeic) {
      setProcessingText("HEIC wird konvertiert...");
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/convert-heic", {
          method: "POST",
          body: fd,
        });
        const data = await res.json();
        if (!res.ok || !data.image) {
          setError(data.error || "HEIC-Konvertierung fehlgeschlagen. Bitte verwenden Sie JPG oder PNG.");
          setProcessing(false);
          return;
        }
        setProcessingText("Bild wird komprimiert...");
        const compressed = await compressImage(data.image);
        setPreview(compressed);
        setProcessing(false);
      } catch (err) {
        console.error("HEIC conversion error:", err);
        setError("HEIC-Konvertierung fehlgeschlagen. Bitte verwenden Sie JPG oder PNG.");
        setProcessing(false);
      }
      return;
    }

    // JPG/PNG/WebP: compress via canvas (resize to max 1920px, JPEG 0.7)
    setProcessingText("Bild wird komprimiert...");
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const compressed = await compressImage(reader.result as string);
        setPreview(compressed);
      } catch {
        setError("Fehler beim Verarbeiten des Bildes.");
      }
      setProcessing(false);
    };
    reader.onerror = () => {
      setError("Fehler beim Lesen der Datei.");
      setProcessing(false);
    };
    reader.readAsDataURL(file);
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    setDragging(true);
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  }

  // ── Preview state ──
  if (preview) {
    return (
      <div className="flex flex-col items-center gap-5">
        <div className="relative w-full overflow-hidden rounded-xl shadow-lg">
          <img
            src={preview}
            alt="Hochgeladenes Raumfoto"
            className="w-full object-contain"
          />
          {/* Bottom overlay */}
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 via-black/40 to-transparent px-5 pb-4 pt-10">
            <div className="flex items-center gap-2">
              <span
                className="flex h-6 w-6 items-center justify-center rounded-full text-xs"
                style={{ backgroundColor: "var(--green)", color: "var(--white)" }}
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </span>
              <span className="text-sm font-medium text-white">
                Ihr Raum wurde analysiert
              </span>
            </div>
            <button
              onClick={() => {
                setPreview(null);
                setError("");
              }}
              className="rounded-lg bg-white/20 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/30"
            >
              Anderes Foto
            </button>
          </div>
        </div>

        <button
          onClick={() => onImageUploaded(preview)}
          className="w-full rounded-xl py-3 text-center text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: "var(--oak)" }}
        >
          Weiter — Boden auswählen
        </button>
      </div>
    );
  }

  // ── Upload zone ──
  return (
    <div className="flex flex-col gap-8">
      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
        }}
        aria-label="Raumfoto hochladen — Klicken oder Datei hierher ziehen"
        className="upload-zone relative cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all duration-200 sm:p-10"
        style={{
          borderColor: dragging ? "var(--oak)" : "var(--oak-light)",
          background: dragging
            ? "linear-gradient(135deg, var(--oak-pale) 0%, #faf5e8 100%)"
            : "linear-gradient(135deg, #fdfbf6 0%, var(--oak-pale) 100%)",
          transform: dragging ? "translateY(-2px)" : undefined,
          boxShadow: dragging
            ? "0 8px 24px rgba(139, 105, 20, 0.15)"
            : undefined,
        }}
      >
        {/* Hover styles */}
        <style>{`
          .upload-zone:hover {
            border-color: var(--oak) !important;
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(139, 105, 20, 0.15);
          }
        `}</style>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/heic,.heic"
          capture="environment"
          onChange={handleFileChange}
          aria-label="Bilddatei auswählen"
          className="hidden"
        />

        <div className="flex flex-col items-center">
          {/* Icon circle */}
          <div
            className="mb-5 flex h-16 w-16 items-center justify-center rounded-full shadow-md"
            style={{
              background: "linear-gradient(135deg, var(--oak) 0%, var(--oak-light) 100%)",
            }}
          >
            <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>

          <h3 className="text-lg font-semibold" style={{ color: "var(--dark)" }}>
            Foto von Ihrem Raum hochladen
          </h3>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed" style={{ color: "var(--grey)" }}>
            Machen Sie ein Foto von Ihrem Raum und sehen Sie sofort, wie Ihr
            neuer Boden darin aussehen wird.
          </p>

          {/* Format badges */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {["JPG", "PNG", "HEIC", "max. 20 MB"].map((label) => (
              <span
                key={label}
                className="rounded-full border bg-white px-3 py-1 text-xs font-medium"
                style={{ borderColor: "var(--grey-lighter)", color: "var(--grey)" }}
              >
                {label}
              </span>
            ))}
          </div>

          {/* Mobile camera hint */}
          <div
            className="mt-5 rounded-lg px-4 py-2.5 text-xs sm:text-sm"
            style={{ backgroundColor: "var(--oak-pale)", color: "var(--oak)" }}
          >
            Auf dem Handy? Tippen Sie hier um direkt die Kamera zu öffnen
          </div>
        </div>

        {/* Processing overlay */}
        {processing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-white/80 backdrop-blur-sm">
            <div
              className="mb-3 h-10 w-10 animate-spin rounded-full border-4 border-t-transparent"
              style={{ borderColor: "var(--oak-pale)", borderTopColor: "var(--oak)" }}
            />
            <p className="text-sm font-medium" style={{ color: "var(--oak)" }}>
              {processingText}
            </p>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div
          className="rounded-lg px-4 py-3 text-sm"
          style={{ backgroundColor: "#FEF2F2", color: "#DC2626" }}
        >
          {error}
        </div>
      )}

      {/* Feature cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="rounded-xl bg-white p-5 text-center shadow-sm"
            style={{
              boxShadow: "0 1px 3px rgba(139, 105, 20, 0.08), 0 4px 12px rgba(139, 105, 20, 0.04)",
            }}
          >
            <div className="mb-2 text-2xl">{f.icon}</div>
            <p className="text-sm font-semibold" style={{ color: "var(--dark)" }}>
              {f.title}
            </p>
            <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--grey)" }}>
              {f.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
