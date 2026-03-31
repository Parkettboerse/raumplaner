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
    <div className="cat-scroll flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
      <style>{`.cat-scroll::-webkit-scrollbar{display:none}`}</style>
      {TABS.map((tab) => {
        const on = activeCategory === tab.value;
        return (
          <button
            key={tab.value}
            onClick={() => onCategoryChange(tab.value)}
            className="shrink-0 rounded-full px-4 py-2 text-[13px] font-medium transition-all duration-200"
            style={{
              backgroundColor: on ? "var(--black)" : "transparent",
              color: on ? "var(--white)" : "var(--grey)",
              border: on ? "1.5px solid var(--black)" : "1.5px solid var(--grey-border)",
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
