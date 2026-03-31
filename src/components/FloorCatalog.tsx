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
    <div className="flex h-full flex-col">
      <div className="px-4 pt-4 sm:px-5 sm:pt-5">
        <h3 className="text-base font-bold" style={{ color: "var(--black)" }}>Bodenbeläge</h3>
        <p className="mb-3 text-xs" style={{ color: "var(--grey)" }}>Aus unserem Sortiment</p>
        <CategoryTabs activeCategory={cat} onCategoryChange={setCat} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: "var(--grey-border)", borderTopColor: "var(--gold)" }} />
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-10 text-center text-sm" style={{ color: "var(--grey-light)" }}>Keine Produkte.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {filtered.map((p) => (
              <FloorCard key={p.id} product={p} selected={selectedFloor?.id === p.id} onSelect={onFloorSelect} />
            ))}
          </div>
        )}
      </div>

      {/* Sticky apply button — fixed on mobile */}
      <div className="border-t px-4 py-3 sm:px-5" style={{ borderColor: "var(--grey-border)" }}>
        {selectedFloor && (
          <p className="mb-2 truncate text-xs" style={{ color: "var(--grey)" }}>
            <span className="font-medium" style={{ color: "var(--black)" }}>{selectedFloor.name}</span> — {selectedFloor.price}
          </p>
        )}
        <button
          onClick={onApply}
          disabled={!selectedFloor}
          className="relative w-full overflow-hidden rounded-xl py-3 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-30"
          style={{ backgroundColor: selectedFloor ? "var(--gold)" : "var(--grey-border)", color: selectedFloor ? "var(--black)" : "var(--grey)" }}
        >
          <span className="relative z-10">Boden anwenden</span>
          {selectedFloor && <div className="absolute inset-0 z-0" style={{background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.3),transparent)",animation:"shine 2.5s infinite"}} />}
        </button>
      </div>
    </div>
  );
}
