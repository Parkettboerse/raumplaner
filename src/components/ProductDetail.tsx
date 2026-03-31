"use client";

import { FloorProduct } from "@/types";

interface Props { product: FloorProduct; onBack: () => void; }

export default function ProductDetail({ product, onBack }: Props) {
  return (
    <div>
      <button onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "14px", fontWeight: 500, color: "var(--grey)", background: "none", border: "none", cursor: "pointer", marginBottom: "20px", fontFamily: "inherit" }}>
        ← Zurück zur Vorschau
      </button>

      <div className="prod-result">
        {product.texture_url && (
          <div className="prod-result-tex"><img src={product.texture_url} alt={product.name} /></div>
        )}
        <div className="prod-result-info">
          <h3>{product.name}</h3>
          <p>{product.detail}</p>
        </div>
        <div className="prod-result-price">{product.price}</div>
      </div>

      <div style={{ marginTop: "16px" }}>
        <a href={product.shop_url} target="_blank" rel="noopener noreferrer" className="go-btn" style={{ display: "block", textAlign: "center", textDecoration: "none" }}>
          Jetzt auf parkettboerse.net bestellen →
        </a>
      </div>

      <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
        <div style={{ background: "#F0FAF0", borderRadius: "14px", padding: "14px 18px", fontSize: "14px" }}>
          <span style={{ color: "var(--green)", fontWeight: 700 }}>✓</span> Verfügbar und direkt bestellbar.
        </div>
        <div style={{ background: "var(--gold-pale)", borderRadius: "14px", padding: "14px 18px", fontSize: "14px" }}>
          Fragen? <a href="tel:+498214552680" style={{ fontWeight: 600, textDecoration: "underline" }}>0821 455 268 0</a> oder <a href="mailto:augsburg@parkettboerse.net" style={{ fontWeight: 600, textDecoration: "underline" }}>augsburg@parkettboerse.net</a>
        </div>
        <div style={{ border: "1px solid var(--grey-border)", borderRadius: "14px", padding: "14px 18px", fontSize: "14px" }}>
          Ausstellung: <strong>Eichleitnerstraße 5, 86199 Augsburg</strong> — 800m²
        </div>
      </div>
    </div>
  );
}
