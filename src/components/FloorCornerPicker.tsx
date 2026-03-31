"use client";

import { useState, useRef, MouseEvent, TouchEvent } from "react";

interface Corner {
  x: number;
  y: number;
}

interface FloorCornerPickerProps {
  image: string;
  onComplete: (corners: Corner[]) => void;
  onBack: () => void;
}

const LABELS = ["Hinten links", "Hinten rechts", "Vorne rechts", "Vorne links"];

export default function FloorCornerPicker({
  image,
  onComplete,
  onBack,
}: FloorCornerPickerProps) {
  const [corners, setCorners] = useState<Corner[]>([]);
  const imgRef = useRef<HTMLImageElement>(null);

  function getPercent(clientX: number, clientY: number): Corner | null {
    const img = imgRef.current;
    if (!img) return null;
    const rect = img.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
  }

  function handleClick(e: MouseEvent<HTMLDivElement>) {
    if (corners.length >= 4) return;
    const pt = getPercent(e.clientX, e.clientY);
    if (pt) setCorners([...corners, pt]);
  }

  function handleTouch(e: TouchEvent<HTMLDivElement>) {
    if (corners.length >= 4) return;
    e.preventDefault();
    const touch = e.changedTouches[0];
    const pt = getPercent(touch.clientX, touch.clientY);
    if (pt) setCorners([...corners, pt]);
  }

  function handleReset() {
    setCorners([]);
  }

  const isComplete = corners.length === 4;

  return (
    <div>
      {/* Instructions */}
      <div className="mb-4 rounded-lg px-4 py-3" style={{ backgroundColor: "var(--oak-pale)", color: "var(--oak)" }}>
        <p className="text-sm font-semibold">
          Tippen Sie auf die 4 Ecken Ihres Bodens
        </p>
        <p className="mt-1 text-xs" style={{ color: "var(--grey)" }}>
          Reihenfolge: 1. Hinten links &rarr; 2. Hinten rechts &rarr; 3. Vorne rechts &rarr; 4. Vorne links
        </p>
      </div>

      {/* Image with click targets */}
      <div
        className="relative cursor-crosshair select-none overflow-hidden rounded-xl shadow-lg"
        onClick={handleClick}
        onTouchEnd={handleTouch}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={image}
          alt="Raumfoto — Boden markieren"
          className="w-full object-contain"
          draggable={false}
        />

        {/* SVG overlay for lines and fill */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full">
          {/* Fill polygon if 4 corners set */}
          {isComplete && (
            <polygon
              points={corners.map((c) => `${c.x}%,${c.y}%`).join(" ")}
              fill="rgba(39, 174, 96, 0.2)"
              stroke="var(--green)"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          )}
          {/* Lines between corners */}
          {corners.length >= 2 &&
            corners.slice(0, -1).map((c, i) => (
              <line
                key={i}
                x1={`${c.x}%`}
                y1={`${c.y}%`}
                x2={`${corners[i + 1].x}%`}
                y2={`${corners[i + 1].y}%`}
                stroke="var(--green)"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
                strokeDasharray={isComplete ? "none" : "6 3"}
              />
            ))}
          {/* Closing line when complete */}
          {isComplete && (
            <line
              x1={`${corners[3].x}%`}
              y1={`${corners[3].y}%`}
              x2={`${corners[0].x}%`}
              y2={`${corners[0].y}%`}
              stroke="var(--green)"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>

        {/* Corner dots */}
        {corners.map((c, i) => (
          <div
            key={i}
            className="pointer-events-none absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-xs font-bold text-white shadow-md"
            style={{
              left: `${c.x}%`,
              top: `${c.y}%`,
              backgroundColor: "var(--green)",
              border: "2px solid white",
            }}
          >
            {i + 1}
          </div>
        ))}

        {/* Hint overlay if no corners yet */}
        {corners.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="rounded-lg bg-black/50 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm">
              Tippen Sie auf Ecke 1: Hinten links
            </div>
          </div>
        )}

        {/* Next corner hint */}
        {corners.length > 0 && corners.length < 4 && (
          <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg bg-black/50 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
            Ecke {corners.length + 1}: {LABELS[corners.length]}
          </div>
        )}
      </div>

      {/* Progress dots */}
      <div className="mt-4 flex items-center justify-center gap-3">
        {LABELS.map((label, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div
              className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold"
              style={{
                backgroundColor: i < corners.length ? "var(--green)" : "var(--oak-pale)",
                color: i < corners.length ? "white" : "var(--grey-light)",
              }}
            >
              {i + 1}
            </div>
            <span className="hidden text-xs sm:inline" style={{ color: i < corners.length ? "var(--green)" : "var(--grey-light)" }}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Buttons */}
      <div className="mt-4 flex gap-3">
        <button
          onClick={onBack}
          className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-50"
          style={{ borderColor: "var(--grey-lighter)", color: "var(--dark)" }}
        >
          Anderes Foto
        </button>
        {corners.length > 0 && (
          <button
            onClick={handleReset}
            className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-50"
            style={{ borderColor: "var(--grey-lighter)", color: "var(--grey)" }}
          >
            Zurücksetzen
          </button>
        )}
        <button
          onClick={() => isComplete && onComplete(corners)}
          disabled={!isComplete}
          className="ml-auto rounded-lg px-6 py-2 text-sm font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          style={{ backgroundColor: isComplete ? "var(--oak)" : "var(--grey-lighter)" }}
        >
          Weiter →
        </button>
      </div>
    </div>
  );
}
