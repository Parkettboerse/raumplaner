"use client";

import { FloorProduct } from "@/types";

interface Props { product: FloorProduct; selected: boolean; onSelect: (p: FloorProduct) => void; }

export default function FloorCard({ product, selected, onSelect }: Props) {
  return (
    <div onClick={() => onSelect(product)} style={{
      borderRadius: 14, overflow: "hidden", cursor: "pointer",
      border: selected ? "2px solid #C8A415" : "2px solid transparent",
      background: "#FFFFFF", transition: "all .2s",
    }}>
      <div style={{ height: 78, position: "relative", overflow: "hidden" }}>
        {product.texture_url ? (
          <img src={product.texture_url} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", background: "#E8E4DC" }} />
        )}
        {selected && (
          <div style={{ position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: "50%", background: "#C8A415", color: "#1A1A1A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800 }}>✓</div>
        )}
      </div>
      <div style={{ padding: "9px 11px" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A" }}>{product.name}</div>
        <div style={{ fontSize: 11, color: "#A09A90", marginTop: 1 }}>{product.detail}</div>
        <div style={{ fontSize: 14, fontWeight: 700, marginTop: 5, color: "#C8A415" }}>{product.price}</div>
      </div>
    </div>
  );
}
