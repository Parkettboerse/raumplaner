"use client";

import { FloorProduct } from "@/types";

interface FloorCardProps {
  product: FloorProduct;
  selected: boolean;
  onSelect: (product: FloorProduct) => void;
}

export default function FloorCard({
  product,
  selected,
  onSelect,
}: FloorCardProps) {
  return (
    <button
      onClick={() => onSelect(product)}
      aria-label={`${product.name} — ${product.price}${selected ? " (ausgewählt)" : ""}`}
      aria-pressed={selected}
      className="group relative w-full overflow-hidden rounded-[10px] bg-white text-left transition-all duration-200"
      style={{
        border: selected ? "2px solid var(--oak)" : "1px solid transparent",
        boxShadow: selected
          ? "0 4px 12px rgba(139, 105, 20, 0.18)"
          : "0 1px 4px rgba(0, 0, 0, 0.06)",
      }}
      onMouseEnter={(e) => {
        if (!selected) {
          const el = e.currentTarget;
          el.style.transform = "translateY(-2px)";
          el.style.boxShadow = "0 4px 12px rgba(139, 105, 20, 0.15)";
          el.style.border = "1px solid var(--oak-light)";
        }
      }}
      onMouseLeave={(e) => {
        if (!selected) {
          const el = e.currentTarget;
          el.style.transform = "";
          el.style.boxShadow = "0 1px 4px rgba(0, 0, 0, 0.06)";
          el.style.border = "1px solid transparent";
        }
      }}
    >
      {/* Texture image */}
      <div className="relative h-20 w-full overflow-hidden">
        {product.texture_url ? (
          <img
            src={product.texture_url}
            alt={`Textur von ${product.name}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className="h-full w-full"
            role="img"
            aria-label={`Platzhalter-Textur für ${product.name}`}
            style={{
              background:
                "linear-gradient(135deg, var(--oak-pale) 0%, var(--oak-light) 50%, var(--oak) 100%)",
            }}
          />
        )}

        {/* Selected checkmark badge */}
        {selected && (
          <div
            className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full text-white"
            style={{ backgroundColor: "var(--oak)" }}
          >
            <svg
              className="h-3 w-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="px-2.5 py-2">
        <p
          className="truncate text-xs font-semibold leading-tight"
          style={{ color: "var(--dark)" }}
        >
          {product.name}
        </p>
        <p
          className="mt-0.5 truncate text-[10px] leading-tight"
          style={{ color: "var(--grey)" }}
        >
          {product.detail}
        </p>
        <p
          className="mt-1 text-xs font-bold"
          style={{ color: "var(--oak)" }}
        >
          {product.price}
        </p>
      </div>
    </button>
  );
}
