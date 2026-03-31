"use client";

import { FloorProduct } from "@/types";

interface ProductDetailProps {
  product: FloorProduct;
  onBack: () => void;
}

export default function ProductDetail({ product, onBack }: ProductDetailProps) {
  return (
    <div className="animate-fadeIn">
      {/* Back link */}
      <button
        onClick={onBack}
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-70"
        style={{ color: "var(--oak)" }}
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Zurück zur Vorschau
      </button>

      {/* Product card */}
      <div
        className="rounded-2xl bg-white p-6"
        style={{
          boxShadow:
            "0 2px 8px rgba(139, 105, 20, 0.08), 0 8px 24px rgba(139, 105, 20, 0.1)",
        }}
      >
        {/* Top: image + info */}
        <div className="flex gap-5">
          {/* Texture thumbnail */}
          <div className="h-[100px] w-[100px] shrink-0 overflow-hidden rounded-xl">
            {product.texture_url ? (
              <img
                src={product.texture_url}
                alt={`Textur von ${product.name}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div
                className="h-full w-full"
                role="img"
                aria-label={`Platzhalter-Textur für ${product.name}`}
                style={{
                  background:
                    "linear-gradient(135deg, var(--oak-pale) 0%, var(--oak-light) 50%, var(--oak) 100%)",
                }}
              />
            )}
          </div>

          {/* Info */}
          <div className="flex min-w-0 flex-1 flex-col justify-center">
            <h3
              className="text-base font-bold leading-tight"
              style={{ color: "var(--dark)" }}
            >
              {product.name}
            </h3>
            <p
              className="mt-1 text-xs leading-relaxed"
              style={{ color: "var(--grey)" }}
            >
              {product.detail}
            </p>
            <p
              className="mt-2 text-[22px] font-bold"
              style={{ color: "var(--oak)" }}
            >
              {product.price}
            </p>
          </div>
        </div>

        {/* CTA button */}
        <a
          href={product.shop_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-base font-semibold text-white transition-opacity hover:opacity-90"
          style={{
            background:
              "linear-gradient(135deg, var(--oak) 0%, var(--oak-light) 100%)",
            boxShadow: "0 4px 14px rgba(139, 105, 20, 0.35)",
          }}
        >
          Jetzt auf parkettboerse.net bestellen →
        </a>
      </div>

      {/* Info boxes */}
      <div className="mt-5 flex flex-col gap-3">
        {/* Available */}
        <div
          className="rounded-xl px-5 py-4 text-sm leading-relaxed"
          style={{ backgroundColor: "var(--green-bg)", color: "var(--dark)" }}
        >
          <span style={{ color: "var(--green)" }} className="font-semibold">
            &#10003;
          </span>{" "}
          Dieses Produkt ist auf parkettboerse.net verfügbar und kann direkt
          bestellt werden.
        </div>

        {/* Contact */}
        <div
          className="rounded-xl px-5 py-4 text-sm leading-relaxed"
          style={{ backgroundColor: "var(--oak-pale)", color: "var(--dark)" }}
        >
          &#128172; Fragen? Rufen Sie uns an unter{" "}
          <a
            href="tel:+498214552680"
            className="font-semibold underline decoration-1 underline-offset-2"
            style={{ color: "var(--oak)" }}
          >
            0821 455 268 0
          </a>{" "}
          oder schreiben Sie an{" "}
          <a
            href="mailto:augsburg@parkettboerse.net"
            className="font-semibold underline decoration-1 underline-offset-2"
            style={{ color: "var(--oak)" }}
          >
            augsburg@parkettboerse.net
          </a>
        </div>

        {/* Location */}
        <div
          className="rounded-xl border px-5 py-4 text-sm leading-relaxed"
          style={{
            borderColor: "var(--grey-lighter)",
            backgroundColor: "var(--white)",
            color: "var(--dark)",
          }}
        >
          &#128205; Oder besuchen Sie unsere Ausstellung:{" "}
          <span className="font-semibold">
            Eichleitnerstraße 5, 86199 Augsburg
          </span>{" "}
          — 800m² auf 2 Etagen
        </div>
      </div>
    </div>
  );
}
