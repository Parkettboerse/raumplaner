"use client";

import { useState } from "react";
import { FloorProduct } from "@/types";
import CategoryTabs from "./CategoryTabs";
import FloorCard from "./FloorCard";

type Category = FloorProduct["category"] | "alle";

interface Props {
  products: FloorProduct[];
  loading: boolean;
  selectedFloor: FloorProduct | null;
  onFloorSelect: (p: FloorProduct) => void;
  onApply: () => void;
}

export default function FloorCatalog({ products, loading, selectedFloor, onFloorSelect, onApply }: Props) {
  const [cat, setCat] = useState<Category>("alle");
  const filtered = cat === "alle" ? products : products.filter((p) => p.category === cat);

  return (
    <div style={{ background: "#FFFFFF", border: "1px solid #E8E4DC", borderRadius: 20, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "20px 20px 0" }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1A1A1A" }}>Bodenbeläge</h2>
        <p style={{ fontSize: 13, color: "#A09A90", marginTop: 3 }}>Aus unserem Sortiment</p>
      </div>

      <CategoryTabs activeCategory={cat} onCategoryChange={setCat} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: "14px 20px", maxHeight: 400, overflowY: "auto" }}>
        {loading ? (
          <div style={{ gridColumn: "1/-1", display: "flex", justifyContent: "center", padding: "40px 0" }}>
            <div style={{ width: 32, height: 32, border: "3px solid #D4CFC6", borderTopColor: "#C8A415", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
          </div>
        ) : filtered.length === 0 ? (
          <p style={{ gridColumn: "1/-1", textAlign: "center", padding: "40px 0", fontSize: 13, color: "#A09A90" }}>Keine Produkte.</p>
        ) : (
          filtered.map((p) => (
            <FloorCard key={p.id} product={p} selected={selectedFloor?.id === p.id} onSelect={onFloorSelect} />
          ))
        )}
      </div>

      <div style={{ padding: "16px 20px", borderTop: "1px solid #E8E4DC", marginTop: "auto" }}>
        {selectedFloor && (
          <div style={{ padding: "10px 14px", background: "rgba(200,164,21,0.1)", borderRadius: 12, marginBottom: 14, display: "flex", alignItems: "center", gap: 12 }}>
            {selectedFloor.texture_url && (
              <img src={selectedFloor.texture_url} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
            )}
            <div>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1, color: "#C8A415", fontWeight: 600 }}>Ausgewählt</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 1, color: "#1A1A1A" }}>{selectedFloor.name} — {selectedFloor.price}</div>
            </div>
          </div>
        )}
        <button onClick={onApply} disabled={!selectedFloor} style={{
          width: "100%", padding: 15, borderRadius: 14, border: "none",
          background: selectedFloor ? "#C8A415" : "#D4CFC6", color: selectedFloor ? "#1A1A1A" : "#666",
          fontFamily: "inherit", fontSize: 15, fontWeight: 700, cursor: selectedFloor ? "pointer" : "not-allowed",
          transition: "all .25s", opacity: selectedFloor ? 1 : 0.5,
        }}>Boden anwenden →</button>
      </div>
    </div>
  );
}
