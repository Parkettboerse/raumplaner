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
    <div className="flex h-full flex-col bg-white" style={{ border: "1px solid var(--grey-border)", borderRadius: "var(--radius)" }}>
      {/* Header */}
      <div style={{ padding: "22px 22px 0" }}>
        <h3 className="text-[20px] font-bold" style={{ color: "var(--dark)" }}>Bodenbeläge</h3>
        <p className="mb-4 mt-1 text-[13px]" style={{ color: "var(--grey)" }}>Aus unserem Sortiment wählen</p>
        <CategoryTabs activeCategory={cat} onCategoryChange={setCat} />
      </div>

      {/* Grid */}
      <div className="min-h-0 flex-1 overflow-y-auto" style={{ padding: "16px 22px", maxHeight: "400px" }}>
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="h-7 w-7 rounded-full border-[3px] border-t-transparent" style={{ borderColor: "#eee", borderTopColor: "var(--gold)", animation: "spin 0.7s linear infinite" }} />
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-10 text-center text-[13px]" style={{ color: "var(--grey-light)" }}>Keine Produkte in dieser Kategorie.</p>
        ) : (
          <div className="grid grid-cols-2 gap-[10px]">
            {filtered.map((p) => (
              <FloorCard key={p.id} product={p} selected={selectedFloor?.id === p.id} onSelect={onFloorSelect} />
            ))}
          </div>
        )}
      </div>

      {/* Footer — sticky on mobile */}
      <div className="sticky bottom-0 bg-white lg:static" style={{ padding: "18px 22px", borderTop: "1px solid var(--grey-border)", boxShadow: "0 -4px 20px rgba(0,0,0,0.04)" }}>
        {selectedFloor && (
          <div className="mb-3 flex items-center gap-3" style={{ backgroundColor: "var(--gold-pale)", borderRadius: "12px", padding: "10px 14px" }}>
            {selectedFloor.texture_url && (
              <img src={selectedFloor.texture_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold" style={{ color: "var(--dark)" }}>{selectedFloor.name}</p>
              <p className="text-[12px] font-bold" style={{ color: "var(--gold)" }}>{selectedFloor.price}</p>
            </div>
          </div>
        )}
        <button
          onClick={onApply}
          disabled={!selectedFloor}
          className="cta-btn relative w-full overflow-hidden text-[15px] font-bold transition-all duration-250 disabled:cursor-not-allowed disabled:opacity-30"
          style={{
            padding: "15px",
            borderRadius: "14px",
            backgroundColor: selectedFloor ? "var(--gold)" : "#eee",
            color: selectedFloor ? "var(--black)" : "#bbb",
          }}
          onMouseEnter={(e) => { if (selectedFloor) { e.currentTarget.style.backgroundColor = "var(--gold-hover)"; e.currentTarget.style.boxShadow = "0 8px 24px var(--gold-glow)"; e.currentTarget.style.transform = "translateY(-2px)"; } }}
          onMouseLeave={(e) => { if (selectedFloor) { e.currentTarget.style.backgroundColor = "var(--gold)"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = ""; } }}
        >
          <span className="relative z-10">Boden anwenden</span>
          {selectedFloor && <div className="absolute inset-0 z-0" style={{background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.3),transparent)",animation:"shine 2.5s infinite"}} />}
        </button>
      </div>
    </div>
  );
}
