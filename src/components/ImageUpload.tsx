"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";

interface ImageUploadProps { onImageUploaded: (base64: string) => void; }
const MAX_SIZE = 20 * 1024 * 1024;

async function compressFile(file: Blob): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const MAX = 1024;
  let cw = bitmap.width, ch = bitmap.height;
  if (cw > MAX || ch > MAX) {
    if (cw > ch) { ch = Math.round(MAX * ch / cw); cw = MAX; }
    else { cw = Math.round(MAX * cw / ch); ch = MAX; }
  }
  const c = document.createElement("canvas"); c.width = cw; c.height = ch;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("Canvas");
  ctx.drawImage(bitmap, 0, 0, cw, ch);
  bitmap.close();
  return c.toDataURL("image/jpeg", 0.5);
}

async function compressB64(src: string): Promise<string> {
  const res = await fetch(src);
  const blob = await res.blob();
  return compressFile(blob);
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
    if (!isHeic && !["image/jpeg","image/png","image/webp"].includes(file.type)) { setError("Bitte JPG, PNG oder HEIC."); return; }
    setProcessing(true);
    if (isHeic) {
      setProcessingText("HEIC wird konvertiert...");
      try { const fd = new FormData(); fd.append("file", file); const res = await fetch("/api/convert-heic",{method:"POST",body:fd}); const data = await res.json(); if(!res.ok||!data.image){setError("HEIC fehlgeschlagen.");setProcessing(false);return;} setPreview(await compressB64(data.image));setProcessing(false); } catch{setError("HEIC fehlgeschlagen.");setProcessing(false);}
      return;
    }
    setProcessingText("Wird komprimiert...");
    try { setPreview(await compressFile(file)); } catch { setError("Fehler."); }
    setProcessing(false);
  }

  // Preview state
  if (preview) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-5 px-5 sm:px-8 animate-fadeUp">
        <div className="relative w-full overflow-hidden rounded-2xl shadow-lg">
          <img src={preview} alt="Raumfoto" className="w-full object-contain" />
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/60 to-transparent px-5 pb-4 pt-12">
            <span className="text-sm font-medium text-white/90">Foto bereit</span>
            <button onClick={() => {setPreview(null);setError("");}} className="rounded-full bg-white/20 px-4 py-1.5 text-xs font-medium text-white backdrop-blur-sm hover:bg-white/30 transition">Anderes Foto</button>
          </div>
        </div>
        <button onClick={() => onImageUploaded(preview)} className="cta-btn relative w-full overflow-hidden rounded-full py-4 text-base font-semibold transition-all hover:shadow-lg" style={{backgroundColor:"var(--gold)",color:"var(--black)"}}>
          <span className="relative z-10">Weiter — Boden auswählen</span>
          <div className="absolute inset-0 z-0" style={{background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.3),transparent)",animation:"shine 2s infinite"}} />
        </button>
      </div>
    );
  }

  // Main upload view
  return (
    <div>
      {/* Black hero — full width, no border-radius */}
      <div className="relative overflow-hidden" style={{background:"var(--black)"}}>
        {/* Grain texture */}
        <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage:"url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"}} />
        {/* Gold orbs */}
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full opacity-20" style={{background:"radial-gradient(circle,rgba(200,164,21,0.4),transparent 70%)"}} />
        <div className="absolute -bottom-20 -right-20 h-72 w-72 rounded-full opacity-15" style={{background:"radial-gradient(circle,rgba(200,164,21,0.3),transparent 70%)"}} />

        <div className="relative mx-auto max-w-3xl px-5 pb-6 pt-8 sm:px-8 sm:pb-8 sm:pt-12">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 animate-fadeUp" style={{animationDelay:"0.1s"}}>
            <span className="h-2 w-2 rounded-full" style={{backgroundColor:"var(--gold)",animation:"pulse 2s infinite"}} />
            <span className="text-xs font-medium tracking-wide text-white/60">Parkettbörse Raumplaner</span>
          </div>

          {/* Headline */}
          <h1 className="text-[32px] font-extrabold leading-[1.1] text-white sm:text-[48px] lg:text-[52px] animate-fadeUp" style={{animationDelay:"0.2s"}}>
            Sehen Sie Ihren<br />neuen <span className="shimmer-text">Boden</span>
          </h1>
          <p className="mt-4 max-w-lg text-[15px] leading-relaxed sm:text-[17px] animate-fadeUp" style={{color:"#777",animationDelay:"0.3s"}}>
            Laden Sie ein Foto Ihres Raums hoch und unsere KI zeigt Ihnen in Sekunden, wie Ihr Wunschboden darin aussieht.
          </p>

          {/* Upload zone — glassmorphism */}
          <div
            role="button" tabIndex={0}
            onDragOver={(e:DragEvent)=>{e.preventDefault();setDragging(true);}}
            onDragLeave={(e:DragEvent)=>{e.preventDefault();setDragging(false);}}
            onDrop={(e:DragEvent)=>{e.preventDefault();setDragging(false);const f=e.dataTransfer.files[0];if(f)processFile(f);}}
            onClick={()=>fileRef.current?.click()}
            onKeyDown={(e)=>{if(e.key==="Enter"||e.key===" ")fileRef.current?.click();}}
            className="upload-zone relative mt-8 flex min-h-[240px] cursor-pointer flex-col items-center justify-center rounded-2xl border transition-all duration-300 sm:min-h-[260px] animate-fadeUp"
            style={{
              animationDelay:"0.4s",
              border: dragging ? "2px solid var(--gold)" : "1px solid rgba(255,255,255,0.1)",
              background: dragging ? "rgba(200,164,21,0.1)" : "rgba(255,255,255,0.05)",
              backdropFilter:"blur(16px)", WebkitBackdropFilter:"blur(16px)",
              transform: dragging ? "translateY(-4px)" : undefined,
              boxShadow: dragging ? "0 12px 40px var(--gold-glow)" : undefined,
            }}
          >
            <style>{`
              .upload-zone:hover { border-color: var(--gold) !important; background: rgba(200,164,21,0.08) !important; transform: translateY(-4px); box-shadow: 0 12px 40px var(--gold-glow) !important; }
            `}</style>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/heic,.heic" onChange={(e:ChangeEvent<HTMLInputElement>)=>{const f=e.target.files?.[0];if(f)processFile(f);e.target.value="";}} className="hidden" />

            <div className="animate-float flex h-16 w-16 items-center justify-center rounded-full" style={{background:"linear-gradient(135deg,#C8A415,#D4B84A)",boxShadow:"0 8px 32px var(--gold-glow)"}}>
              <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="mt-5 text-lg font-semibold text-white">Foto hochladen</p>
            <p className="mt-1 text-sm text-white/40">oder hierher ziehen</p>
            <div className="mt-4 flex gap-2">
              {["JPG","PNG","HEIC"].map((l)=>(<span key={l} className="rounded-full border border-white/10 px-2.5 py-0.5 text-[10px] font-medium text-white/30">{l}</span>))}
            </div>
            <p className="mt-3 text-xs text-white/30 sm:hidden">Tippen um Kamera zu öffnen</p>

            {processing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-black/70 backdrop-blur-sm">
                <div className="mb-3 h-9 w-9 animate-spin rounded-full border-[3px] border-t-transparent" style={{borderColor:"rgba(255,255,255,0.1)",borderTopColor:"var(--gold)"}} />
                <p className="text-sm text-white/70">{processingText}</p>
              </div>
            )}
          </div>
        </div>

        {/* Transition gradient */}
        <div className="h-16" style={{background:"linear-gradient(to bottom, var(--black), #1A1A1A)"}} />
      </div>

      {error && <p className="mx-auto mt-4 max-w-3xl rounded-xl bg-red-50 px-5 py-3 text-sm text-red-600">{error}</p>}

      {/* "So funktioniert's" */}
      <div className="mx-auto max-w-3xl px-5 pb-6 pt-2 sm:px-8 sm:pt-4">
        <p className="mb-4 text-center text-xs font-semibold uppercase tracking-widest" style={{color:"var(--grey)"}}>So funktioniert&apos;s</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            {n:"01",t:"Foto hochladen",d:"Machen Sie ein Foto Ihres Raums"},
            {n:"02",t:"Boden auswählen",d:"Wählen Sie aus unserem Sortiment"},
            {n:"03",t:"Sofort sehen",d:"KI zeigt das Ergebnis in Sekunden"},
          ].map((s,i)=>(
            <div key={s.n} className="group flex items-start gap-4 rounded-xl bg-white p-5 transition-all duration-300 hover:-translate-y-1 animate-fadeUp" style={{boxShadow:"0 2px 12px rgba(0,0,0,0.04)",animationDelay:`${0.5+i*0.1}s`,animationFillMode:"both"}}>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold" style={{backgroundColor:"var(--black)",color:"var(--gold)"}}>{s.n}</div>
              <div>
                <p className="text-sm font-semibold" style={{color:"var(--dark)"}}>{s.t}</p>
                <p className="mt-0.5 text-xs" style={{color:"var(--grey)"}}>{s.d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
