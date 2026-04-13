"use client";

import { FloorProduct } from "@/types";

interface Props { product: FloorProduct; selected: boolean; onSelect: (p: FloorProduct) => void; }

const CATEGORY_ICONS: Record<string, string> = {
  parkett: "\uD83E\uDEB5",
  vinyl: "\u25A0",
  laminat: "\u25A6",
  kork: "\u25CB",
};

export default function FloorCard({ product, selected, onSelect }: Props) {
  const badge = product.format || product.oberflaeche;

  return (
    <div onClick={() => onSelect(product)} style={{
      borderRadius: 14, overflow: "hidden", cursor: "pointer",
      border: selected ? "2px solid #C8A415" : "2px solid transparent",
      background: "#2A2A2A", transition: "all .2s",
    }}>
      <div style={{ height: 110, position: "relative", overflow: "hidden" }}>
        {product.texture_url ? (
          <img src={product.texture_url} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{
            width: "100%", height: "100%", background: "linear-gradient(135deg, #333 0%, #3a3a3a 100%)",
            display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 4,
          }}>
            <span style={{ fontSize: 28, opacity: 0.5 }}>{CATEGORY_ICONS[product.category] || "\u25A0"}</span>
            <span style={{ fontSize: 10, color: "#666", textTransform: "uppercase", letterSpacing: 1 }}>{product.category}</span>
          </div>
        )}
        {selected && (
          <div style={{ position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: "50%", background: "#C8A415", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800 }}>✓</div>
        )}
        {badge && (
          <div style={{
            position: "absolute", bottom: 6, left: 6,
            background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
            padding: "2px 8px", borderRadius: 6,
            fontSize: 10, fontWeight: 600, color: "#ddd",
          }}>{badge}</div>
        )}
      </div>
      <div style={{ padding: "10px 12px" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", lineHeight: 1.3 }}>{product.name}</div>
        <div style={{ fontSize: 11, color: "#888", marginTop: 2, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{product.detail}</div>
        <div style={{ fontSize: 14, fontWeight: 700, marginTop: 6, color: "#C8A415" }}>{product.price}</div>
      </div>
    </div>
  );
}
