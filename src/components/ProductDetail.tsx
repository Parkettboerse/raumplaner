"use client";

import { FloorProduct } from "@/types";

interface Props { product: FloorProduct; onBack: () => void; }

export default function ProductDetail({ product, onBack }: Props) {
  return (
    <div>
      <button onClick={onBack} className="mb-4 inline-flex items-center gap-1 text-sm hover:opacity-70" style={{ color: "var(--grey)" }}>
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        Zurück zur Vorschau
      </button>

      <div className="rounded-lg border p-5" style={{ borderColor: "var(--grey-border)" }}>
        <div className="flex gap-4">
          <div className="h-[90px] w-[90px] shrink-0 overflow-hidden rounded-lg" style={{ backgroundColor: "var(--grey-bg)" }}>
            {product.texture_url && <img src={product.texture_url} alt={product.name} className="h-full w-full object-cover" />}
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-center">
            <h3 className="text-base font-bold" style={{ color: "var(--black)" }}>{product.name}</h3>
            <p className="mt-0.5 text-xs" style={{ color: "var(--grey)" }}>{product.detail}</p>
            <p className="mt-1.5 text-xl font-bold" style={{ color: "var(--gold)" }}>{product.price}</p>
          </div>
        </div>

        <a href={product.shop_url} target="_blank" rel="noopener noreferrer"
          className="mt-5 flex w-full items-center justify-center rounded-lg py-3 text-sm font-semibold text-white hover:opacity-90"
          style={{ backgroundColor: "var(--black)" }}>
          Jetzt auf parkettboerse.net bestellen
        </a>
      </div>

      <div className="mt-4 flex flex-col gap-2.5">
        <div className="rounded-lg px-4 py-3 text-sm" style={{ backgroundColor: "#F0FAF0", color: "var(--black)" }}>
          <span style={{ color: "var(--green)" }} className="font-medium">&#10003;</span> Dieses Produkt ist verfügbar und kann direkt bestellt werden.
        </div>
        <div className="rounded-lg px-4 py-3 text-sm" style={{ backgroundColor: "var(--gold-pale)", color: "var(--black)" }}>
          Fragen? <a href="tel:+498214552680" className="font-medium underline" style={{ color: "var(--black)" }}>0821 455 268 0</a> oder{" "}
          <a href="mailto:augsburg@parkettboerse.net" className="font-medium underline" style={{ color: "var(--black)" }}>augsburg@parkettboerse.net</a>
        </div>
        <div className="rounded-lg border px-4 py-3 text-sm" style={{ borderColor: "var(--grey-border)", color: "var(--black)" }}>
          Ausstellung: <span className="font-medium">Eichleitnerstraße 5, 86199 Augsburg</span> — 800m²
        </div>
      </div>
    </div>
  );
}
