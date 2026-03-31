"use client";

import { FloorProduct } from "@/types";

type Category = FloorProduct["category"] | "alle";

interface Props { activeCategory: Category; onCategoryChange: (c: Category) => void; }

const TABS: { value: Category; label: string }[] = [
  { value: "alle", label: "Alle" },
  { value: "parkett", label: "Parkett" },
  { value: "vinyl", label: "Vinyl" },
  { value: "laminat", label: "Laminat" },
  { value: "kork", label: "Kork" },
];

export default function CategoryTabs({ activeCategory, onCategoryChange }: Props) {
  return (
    <div className="category-scroll flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
      <style>{`.category-scroll::-webkit-scrollbar { display: none; }`}</style>
      {TABS.map((tab) => {
        const active = activeCategory === tab.value;
        return (
          <button
            key={tab.value}
            onClick={() => onCategoryChange(tab.value)}
            className="shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
            style={{
              backgroundColor: active ? "var(--black)" : "var(--grey-bg)",
              color: active ? "var(--white)" : "var(--grey)",
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
