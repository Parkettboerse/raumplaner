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
    <div style={{ display: "flex", gap: 6, padding: "14px 20px 0", overflowX: "auto", scrollbarWidth: "none" }}>
      {TABS.map((tab) => {
        const on = activeCategory === tab.value;
        return (
          <button key={tab.value} onClick={() => onCategoryChange(tab.value)} style={{
            padding: "7px 16px", borderRadius: 100, fontSize: 12, fontWeight: 600,
            cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit", transition: "all .15s",
            background: on ? "#C8A415" : "transparent",
            color: on ? "#2C2820" : "#A09A90",
            border: on ? "1.5px solid #C8A415" : "1.5px solid #D4CFC6",
          }}>{tab.label}</button>
        );
      })}
    </div>
  );
}
