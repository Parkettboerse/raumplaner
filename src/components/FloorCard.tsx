"use client";

import { FloorProduct } from "@/types";
import LazyImage from "./LazyImage";

interface Props { product: FloorProduct; selected: boolean; onSelect: (p: FloorProduct) => void; }

export default function FloorCard({ product, selected, onSelect }: Props) {
  return (
    <button
      onClick={() => onSelect(product)}
      className="group w-full overflow-hidden text-left transition-all duration-250"
      style={{
        borderRadius: "14px",
        border: selected ? "2px solid var(--gold)" : "2px solid transparent",
        background: "var(--white)",
        boxShadow: selected ? "0 4px 16px var(--gold-glow)" : "none",
      }}
      onMouseEnter={(e) => { if (!selected) { e.currentTarget.style.borderColor = "#e0e0e0"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.06)"; } }}
      onMouseLeave={(e) => { if (!selected) { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "none"; } }}
    >
      <div className="relative" style={{ height: "78px" }}>
        {product.texture_url ? (
          <LazyImage src={product.texture_url} alt={product.name} className="h-full w-full" />
        ) : (
          <div className="h-full w-full" style={{ backgroundColor: "var(--grey-bg)" }} />
        )}
        {selected && (
          <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full" style={{ backgroundColor: "var(--gold)" }}>
            <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
          </div>
        )}
      </div>
      <div className="px-3 py-2.5">
        <p className="truncate text-[13px] font-semibold" style={{ color: "var(--dark)" }}>{product.name}</p>
        <p className="mt-0.5 truncate text-[11px]" style={{ color: "var(--grey)" }}>{product.detail}</p>
        <p className="mt-1.5 text-[14px] font-bold" style={{ color: "var(--gold)" }}>{product.price}</p>
      </div>
    </button>
  );
}
