"use client";

import { FloorProduct } from "@/types";

interface Props { product: FloorProduct; onBack: () => void; }

export default function ProductDetail({ product, onBack }: Props) {
  return (
    <div>
      <button onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 500, color: "#A09A90", background: "none", border: "none", cursor: "pointer", marginBottom: 20, fontFamily: "inherit" }}>
        ← Zurück zur Vorschau
      </button>

      <div style={{ padding: 20, background: "#FFFFFF", border: "1px solid #E8E4DC", borderRadius: 20, display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
        {product.texture_url && (
          <img src={product.texture_url} alt={product.name} style={{ width: 80, height: 80, borderRadius: 12, objectFit: "cover", flexShrink: 0 }} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: "#2C2820" }}>{product.name}</h3>
          <p style={{ fontSize: 13, color: "#A09A90", marginTop: 2 }}>{product.detail}</p>
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#C8A415" }}>{product.price}</div>
      </div>

      <a href={product.shop_url} target="_blank" rel="noopener noreferrer" style={{
        display: "block", width: "100%", padding: 15, borderRadius: 14, border: "none",
        background: "#C8A415", color: "#2C2820", fontSize: 15, fontWeight: 700,
        textAlign: "center", textDecoration: "none", marginTop: 16, cursor: "pointer",
      }}>
        Jetzt auf parkettboerse.net bestellen →
      </a>

      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ background: "rgba(39,174,96,0.1)", borderRadius: 14, padding: "14px 18px", fontSize: 14, color: "#A09A90" }}>
          <span style={{ color: "#27AE60", fontWeight: 700 }}>✓</span> Verfügbar und direkt bestellbar.
        </div>
        <div style={{ background: "rgba(200,164,21,0.08)", borderRadius: 14, padding: "14px 18px", fontSize: 14, color: "#A09A90" }}>
          Fragen? <a href="tel:+498214552680" style={{ fontWeight: 600, color: "#C8A415", textDecoration: "underline" }}>0821 455 268 0</a> oder <a href="mailto:augsburg@parkettboerse.net" style={{ fontWeight: 600, color: "#C8A415", textDecoration: "underline" }}>augsburg@parkettboerse.net</a>
        </div>
        <div style={{ border: "1px solid #E8E4DC", borderRadius: 14, padding: "14px 18px", fontSize: 14, color: "#A09A90" }}>
          Ausstellung: <strong style={{ color: "#2C2820" }}>Eichleitnerstraße 5, 86199 Augsburg</strong> — 800m²
        </div>
      </div>
    </div>
  );
}
