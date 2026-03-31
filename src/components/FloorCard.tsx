"use client";

import { FloorProduct } from "@/types";

interface Props { product: FloorProduct; selected: boolean; onSelect: (p: FloorProduct) => void; }

export default function FloorCard({ product, selected, onSelect }: Props) {
  return (
    <div className={`prod${selected ? " sel" : ""}`} onClick={() => onSelect(product)}>
      <div className="ptex">
        {product.texture_url ? (
          <img src={product.texture_url} alt={product.name} />
        ) : (
          <div style={{ width: "100%", height: "100%", background: "var(--grey-bg)" }} />
        )}
        <div className="chk">✓</div>
      </div>
      <div className="pinfo">
        <div className="pname">{product.name}</div>
        <div className="pdet">{product.detail}</div>
        <div className="pprice">{product.price}</div>
      </div>
    </div>
  );
}
