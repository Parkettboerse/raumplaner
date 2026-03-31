"use client";

import { useState, useEffect } from "react";
import { FloorProduct } from "@/types";
import CategoryTabs from "./CategoryTabs";
import FloorCard from "./FloorCard";

type Category = FloorProduct["category"] | "alle";

interface FloorCatalogProps {
  selectedFloor: FloorProduct | null;
  onFloorSelect: (product: FloorProduct) => void;
  onApply: () => void;
}

export default function FloorCatalog({
  selectedFloor,
  onFloorSelect,
  onApply,
}: FloorCatalogProps) {
  const [products, setProducts] = useState<FloorProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<Category>("alle");

  useEffect(() => {
    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => {
        setProducts(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered =
    activeCategory === "alle"
      ? products
      : products.filter((p) => p.category === activeCategory);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="px-5 pt-5 sm:px-6 sm:pt-6">
        <h3
          className="font-display text-lg font-semibold"
          style={{ color: "var(--dark)" }}
        >
          Bodenbeläge
        </h3>
        <p className="mb-3 text-xs" style={{ color: "var(--grey)" }}>
          Aus unserem Sortiment wählen
        </p>
        <CategoryTabs
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
        />
      </div>

      {/* Product grid — scrollable */}
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div
              className="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"
              style={{
                borderColor: "var(--oak-pale)",
                borderTopColor: "var(--oak)",
              }}
            />
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-10 text-center text-sm" style={{ color: "var(--grey-light)" }}>
            Keine Produkte in dieser Kategorie.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {filtered.map((product) => (
              <FloorCard
                key={product.id}
                product={product}
                selected={selectedFloor?.id === product.id}
                onSelect={onFloorSelect}
              />
            ))}
          </div>
        )}
      </div>

      {/* Sticky footer */}
      <div
        className="border-t px-5 py-4 sm:px-6"
        style={{ borderColor: "var(--grey-lighter)" }}
      >
        {selectedFloor && (
          <div
            className="mb-3 rounded-lg px-3 py-2 text-xs"
            style={{ backgroundColor: "var(--oak-pale)", color: "var(--oak)" }}
          >
            <span className="font-medium">Ausgewählt:</span>{" "}
            {selectedFloor.name} — {selectedFloor.price}
          </div>
        )}
        <button
          onClick={onApply}
          disabled={!selectedFloor}
          aria-label={selectedFloor ? `${selectedFloor.name} anwenden` : "Bitte zuerst einen Boden auswählen"}
          className="w-full rounded-xl py-2.5 text-sm font-semibold text-white transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40"
          style={{
            background: selectedFloor
              ? "linear-gradient(135deg, var(--oak) 0%, var(--oak-light) 100%)"
              : "var(--grey-lighter)",
            boxShadow: selectedFloor
              ? "0 4px 12px rgba(139, 105, 20, 0.3)"
              : "none",
          }}
        >
          Boden anwenden →
        </button>
      </div>
    </div>
  );
}
