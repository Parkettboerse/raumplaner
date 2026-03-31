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
    <div className="sidebar">
      <div className="sb-head">
        <h2>Bodenbeläge</h2>
        <p>Aus unserem Sortiment</p>
      </div>

      <CategoryTabs activeCategory={cat} onCategoryChange={setCat} />

      <div className="prod-grid">
        {loading ? (
          <div style={{ gridColumn: "1/-1", display: "flex", justifyContent: "center", padding: "40px 0" }}>
            <div className="load-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <p style={{ gridColumn: "1/-1", textAlign: "center", padding: "40px 0", fontSize: "13px", color: "var(--grey-light)" }}>
            Keine Produkte in dieser Kategorie.
          </p>
        ) : (
          filtered.map((p) => (
            <FloorCard key={p.id} product={p} selected={selectedFloor?.id === p.id} onSelect={onFloorSelect} />
          ))
        )}
      </div>

      <div className="sb-foot">
        {selectedFloor && (
          <div className="sel-preview">
            {selectedFloor.texture_url && (
              <div className="sel-tex"><img src={selectedFloor.texture_url} alt="" /></div>
            )}
            <div>
              <div className="sel-label">Ausgewählt</div>
              <div className="sel-name">{selectedFloor.name} — {selectedFloor.price}</div>
            </div>
          </div>
        )}
        <button className="go-btn" onClick={onApply} disabled={!selectedFloor}>
          Boden anwenden →
        </button>
      </div>
    </div>
  );
}
