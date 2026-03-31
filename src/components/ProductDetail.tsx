"use client";

import { FloorProduct } from "@/types";

interface Props { product: FloorProduct; onBack: () => void; }

export default function ProductDetail({ product, onBack }: Props) {
  return (
    <div>
      <button onClick={onBack} className="mb-5 inline-flex items-center gap-1.5 text-[14px] font-medium transition-opacity hover:opacity-70" style={{ color: "var(--grey)" }}>
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        Zurück zur Vorschau
      </button>

      <div style={{ border: "1px solid var(--grey-border)", borderRadius: "var(--radius)", padding: "24px" }}>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="h-[80px] w-[80px] shrink-0 overflow-hidden rounded-xl" style={{ backgroundColor: "var(--grey-bg)" }}>
            {product.texture_url && <img src={product.texture_url} alt={product.name} className="h-full w-full object-cover" />}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-[17px] font-bold" style={{ color: "var(--dark)" }}>{product.name}</h3>
            <p className="mt-0.5 text-[13px]" style={{ color: "var(--grey)" }}>{product.detail}</p>
          </div>
          <p className="text-[22px] font-extrabold" style={{ color: "var(--gold)" }}>{product.price}</p>
        </div>

        <a href={product.shop_url} target="_blank" rel="noopener noreferrer"
          className="relative mt-6 flex w-full items-center justify-center overflow-hidden text-[15px] font-bold transition-all duration-250 hover:-translate-y-0.5"
          style={{ backgroundColor: "var(--gold)", color: "var(--black)", padding: "15px", borderRadius: "14px" }}
          onMouseEnter={(e)=>{e.currentTarget.style.boxShadow="0 8px 24px var(--gold-glow)";}}
          onMouseLeave={(e)=>{e.currentTarget.style.boxShadow="none";}}>
          <span className="relative z-10">Jetzt auf parkettboerse.net bestellen</span>
          <div className="absolute inset-0 z-0" style={{background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.3),transparent)",animation:"shine 2.5s infinite"}} />
        </a>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <div className="rounded-xl text-[14px]" style={{ backgroundColor: "#F0FAF0", padding: "14px 18px", color: "var(--dark)" }}>
          <span className="font-semibold" style={{ color: "var(--green)" }}>&#10003;</span> Verfügbar und direkt bestellbar.
        </div>
        <div className="rounded-xl text-[14px]" style={{ backgroundColor: "var(--gold-pale)", padding: "14px 18px", color: "var(--dark)" }}>
          Fragen? <a href="tel:+498214552680" className="font-semibold underline">0821 455 268 0</a> oder <a href="mailto:augsburg@parkettboerse.net" className="font-semibold underline">augsburg@parkettboerse.net</a>
        </div>
        <div className="rounded-xl text-[14px]" style={{ border: "1px solid var(--grey-border)", padding: "14px 18px", color: "var(--dark)" }}>
          Ausstellung: <span className="font-semibold">Eichleitnerstraße 5, 86199 Augsburg</span> — 800m²
        </div>
      </div>
    </div>
  );
}
