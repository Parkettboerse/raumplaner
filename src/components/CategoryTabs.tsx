"use client";

import { FloorProduct } from "@/types";

type Category = FloorProduct["category"] | "alle";

interface CategoryTabsProps {
  activeCategory: Category;
  onCategoryChange: (category: Category) => void;
}

const TABS: { value: Category; label: string }[] = [
  { value: "alle", label: "Alle" },
  { value: "parkett", label: "Parkett" },
  { value: "vinyl", label: "Vinyl" },
  { value: "laminat", label: "Laminat" },
  { value: "kork", label: "Kork" },
];

export default function CategoryTabs({
  activeCategory,
  onCategoryChange,
}: CategoryTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Bodenbelag-Kategorien"
      className="category-tabs-scroll flex gap-2 overflow-x-auto pb-1"
      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
    >
      <style>{`
        .category-tabs-scroll::-webkit-scrollbar { display: none; }
      `}</style>
      {TABS.map((tab) => {
        const isActive = activeCategory === tab.value;
        return (
          <button
            key={tab.value}
            onClick={() => onCategoryChange(tab.value)}
            role="tab"
            aria-selected={isActive}
            aria-label={`Kategorie ${tab.label}`}
            className="shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-200"
            style={{
              backgroundColor: isActive ? "var(--oak)" : "var(--oak-pale)",
              color: isActive ? "var(--white)" : "var(--grey)",
              border: isActive ? "1px solid var(--oak)" : "1px solid transparent",
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                (e.target as HTMLElement).style.borderColor = "var(--oak)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                (e.target as HTMLElement).style.borderColor = "transparent";
              }
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
