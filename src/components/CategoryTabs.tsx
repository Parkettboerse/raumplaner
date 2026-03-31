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
    <div className="cat-bar">
      {TABS.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onCategoryChange(tab.value)}
          className={`cat${activeCategory === tab.value ? " on" : ""}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
