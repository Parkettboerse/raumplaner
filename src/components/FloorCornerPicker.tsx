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
    return {
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    };
  }

  function handleClick(e: MouseEvent<HTMLDivElement>) {
    const pt = getPercent(e.clientX, e.clientY);
    if (pt) setCorners((prev) => [...prev, pt]);
  }

  function handleTouch(e: TouchEvent<HTMLDivElement>) {
    e.preventDefault();
    const touch = e.changedTouches[0];
    const pt = getPercent(touch.clientX, touch.clientY);
    if (pt) setCorners((prev) => [...prev, pt]);
  }

  const canFinish = corners.length >= 3;

  return (
    <div>
      {/* Instructions */}
      <div
        className="mb-4 rounded-lg px-4 py-3"
        style={{ backgroundColor: "var(--oak-pale)", color: "var(--oak)" }}
      >
        <p className="text-sm font-semibold">
          Tippen Sie entlang der Kanten Ihres Bodens
        </p>
        <p className="mt-1 text-xs" style={{ color: "var(--grey)" }}>
          Beginnen Sie in einer Ecke und gehen Sie im Uhrzeigersinn.
          Je mehr Punkte, desto genauer.
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

        {/* SVG overlay */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full">
          {/* Filled polygon preview (3+ points) */}
          {canFinish && (
            <polygon
              points={corners.map((c) => `${c.x}%,${c.y}%`).join(" ")}
              fill="rgba(39, 174, 96, 0.18)"
              stroke="var(--green)"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          )}
          {/* Lines between consecutive points */}
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
                strokeDasharray={canFinish ? "none" : "6 3"}
              />
            ))}
          {/* Closing line (last → first) */}
          {canFinish && (
            <line
              x1={`${corners[corners.length - 1].x}%`}
              y1={`${corners[corners.length - 1].y}%`}
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
            className="pointer-events-none absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-md"
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

        {/* Hint overlay */}
        {corners.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="rounded-lg bg-black/50 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm">
              Tippen Sie auf die erste Ecke des Bodens
            </div>
          </div>
        )}

        {/* Point counter */}
        {corners.length > 0 && (
          <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg bg-black/50 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
            {corners.length} {corners.length === 1 ? "Punkt" : "Punkte"} gesetzt
            {!canFinish && " — mindestens 3 nötig"}
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={onBack}
          className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-50"
          style={{ borderColor: "var(--grey-lighter)", color: "var(--dark)" }}
        >
          Anderes Foto
        </button>
        {corners.length > 0 && (
          <button
            onClick={() => setCorners((prev) => prev.slice(0, -1))}
            className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-50"
            style={{ borderColor: "var(--grey-lighter)", color: "var(--grey)" }}
          >
            Letzten Punkt entfernen
          </button>
        )}
        {corners.length > 0 && (
          <button
            onClick={() => setCorners([])}
            className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-50"
            style={{ borderColor: "var(--grey-lighter)", color: "var(--grey)" }}
          >
            Alle löschen
          </button>
        )}
        <button
          onClick={() => canFinish && onComplete(corners)}
          disabled={!canFinish}
          className="ml-auto rounded-lg px-6 py-2 text-sm font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          style={{ backgroundColor: canFinish ? "var(--oak)" : "var(--grey-lighter)" }}
        >
          Fertig →
        </button>
      </div>
    </div>
  );
}
