"use client";

import { FloorProduct } from "@/types";
import LazyImage from "./LazyImage";

interface Props { product: FloorProduct; selected: boolean; onSelect: (p: FloorProduct) => void; }

export default function FloorCard({ product, selected, onSelect }: Props) {
  return (
    <button
      onClick={() => onSelect(product)}
      className="w-full overflow-hidden rounded-lg border text-left transition-all"
      style={{
        borderColor: selected ? "var(--gold)" : "var(--grey-border)",
        borderWidth: selected ? "2px" : "1px",
      }}
    >
      <div className="relative h-20 w-full">
        {product.texture_url ? (
          <LazyImage src={product.texture_url} alt={product.name} className="h-full w-full" />
        ) : (
          <div className="h-full w-full" style={{ backgroundColor: "var(--grey-bg)" }} />
        )}
        {selected && (
          <div className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full text-white" style={{ backgroundColor: "var(--gold)" }}>
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
          </div>
        )}
      </div>
      <div className="px-2.5 py-2">
        <p className="truncate text-xs font-semibold" style={{ color: "var(--black)" }}>{product.name}</p>
        <p className="mt-0.5 truncate text-[10px]" style={{ color: "var(--grey)" }}>{product.detail}</p>
        <p className="mt-1 text-xs font-bold" style={{ color: "var(--gold)" }}>{product.price}</p>
      </div>
    </button>
  );
}
