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

// ── Animated tutorial SVG ──
function TutorialAnimation() {
  // 5 floor corner points that animate in sequence
  const pts = [
    { x: 90, y: 110 },
    { x: 210, y: 100 },
    { x: 240, y: 180 },
    { x: 180, y: 200 },
    { x: 60, y: 190 },
  ];
  const polyStr = pts.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <svg viewBox="0 0 300 240" className="mx-auto w-full max-w-[260px]">
      {/* Room outline */}
      <rect x="40" y="30" width="220" height="180" rx="4" fill="#f5efe0" stroke="#d4d0c8" strokeWidth="1.5" />
      {/* Back wall */}
      <line x1="40" y1="90" x2="260" y2="90" stroke="#d4d0c8" strokeWidth="1" />
      {/* Side walls */}
      <line x1="40" y1="90" x2="60" y2="190" stroke="#d4d0c8" strokeWidth="1" />
      <line x1="260" y1="90" x2="240" y2="190" stroke="#d4d0c8" strokeWidth="1" />

      {/* Floor fill animates in */}
      <polygon points={polyStr} fill="#27AE60" fillOpacity="0.15" stroke="#27AE60" strokeWidth="2">
        <animate attributeName="fill-opacity" values="0;0;0.15;0.15;0.15;0" dur="4s" repeatCount="indefinite" />
        <animate attributeName="stroke-dasharray" values="300;0" dur="2s" begin="0.5s" fill="freeze" repeatCount="indefinite" />
      </polygon>

      {/* Dots appear one by one */}
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="8" fill="#27AE60" stroke="white" strokeWidth="2" opacity="0">
            <animate attributeName="opacity" values="0;1" dur="0.2s" begin={`${0.4 + i * 0.5}s`} fill="freeze" repeatCount="indefinite" />
          </circle>
          <text x={p.x} y={p.y + 4} textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" opacity="0">
            {i + 1}
            <animate attributeName="opacity" values="0;1" dur="0.2s" begin={`${0.4 + i * 0.5}s`} fill="freeze" repeatCount="indefinite" />
          </text>
        </g>
      ))}

      {/* Finger icon that moves between points */}
      <g opacity="0.9">
        <animateTransform
          attributeName="transform"
          type="translate"
          values={pts.map((p) => `${p.x - 10},${p.y - 5}`).join(";")}
          dur="2.5s"
          begin="0.2s"
          repeatCount="indefinite"
        />
        {/* Simple hand/finger pointer */}
        <path
          d="M10 5 C10 2, 14 0, 16 3 L16 12 C18 10, 22 10, 22 13 L22 22 C22 28, 16 30, 12 30 L8 30 C4 30, 2 26, 2 22 L2 14 C2 10, 6 10, 8 12 L8 5 C8 2, 12 2, 10 5Z"
          fill="white"
          stroke="#1A1A18"
          strokeWidth="1.2"
        />
      </g>
    </svg>
  );
}

const TIPS = [
  { icon: "1️⃣", title: "Ecke für Ecke", text: "Tippen Sie auf jede Ecke des Bodens" },
  { icon: "🔄", title: "Im Uhrzeigersinn", text: "Gehen Sie der Reihe nach im Kreis" },
  { icon: "✨", title: "Je mehr, desto besser", text: "Bei Nischen einfach mehr Punkte setzen" },
];

export default function FloorCornerPicker({
  image,
  onComplete,
  onBack,
}: FloorCornerPickerProps) {
  const [corners, setCorners] = useState<Corner[]>([]);
  const [showTutorial, setShowTutorial] = useState(true);
  const imgRef = useRef<HTMLImageElement>(null);

  function getPercent(clientX: number, clientY: number): Corner | null {
    const img = imgRef.current;
    if (!img) return null;
    const rect = img.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100)),
    };
  }

  function handleClick(e: MouseEvent<HTMLDivElement>) {
    if (showTutorial) return;
    const pt = getPercent(e.clientX, e.clientY);
    if (pt) setCorners((prev) => [...prev, pt]);
  }

  function handleTouch(e: TouchEvent<HTMLDivElement>) {
    if (showTutorial) return;
    e.preventDefault();
    const touch = e.changedTouches[0];
    const pt = getPercent(touch.clientX, touch.clientY);
    if (pt) setCorners((prev) => [...prev, pt]);
  }

  const canFinish = corners.length >= 3;

  return (
    <div>
      {/* Image with overlays */}
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

        {/* SVG polygon overlay */}
        {!showTutorial && (
          <svg className="pointer-events-none absolute inset-0 h-full w-full">
            {canFinish && (
              <polygon
                points={corners.map((c) => `${c.x}%,${c.y}%`).join(" ")}
                fill="rgba(39, 174, 96, 0.18)"
                stroke="var(--green)"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
            )}
            {corners.length >= 2 &&
              corners.slice(0, -1).map((c, i) => (
                <line
                  key={i}
                  x1={`${c.x}%`} y1={`${c.y}%`}
                  x2={`${corners[i + 1].x}%`} y2={`${corners[i + 1].y}%`}
                  stroke="var(--green)" strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                  strokeDasharray={canFinish ? "none" : "6 3"}
                />
              ))}
            {canFinish && (
              <line
                x1={`${corners[corners.length - 1].x}%`} y1={`${corners[corners.length - 1].y}%`}
                x2={`${corners[0].x}%`} y2={`${corners[0].y}%`}
                stroke="var(--green)" strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
            )}
          </svg>
        )}

        {/* Corner dots */}
        {!showTutorial &&
          corners.map((c, i) => (
            <div
              key={i}
              className="pointer-events-none absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-md"
              style={{ left: `${c.x}%`, top: `${c.y}%`, backgroundColor: "var(--green)", border: "2px solid white" }}
            >
              {i + 1}
            </div>
          ))}

        {/* Hint banner (when tutorial closed, no points yet) */}
        {!showTutorial && corners.length === 0 && (
          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-center">
            <div className="m-3 flex items-center gap-2 rounded-lg bg-black/50 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm">
              Tippen Sie auf die Ecken Ihres Bodens
            </div>
          </div>
        )}

        {/* Help button (top-right) */}
        {!showTutorial && (
          <button
            onClick={(e) => { e.stopPropagation(); setShowTutorial(true); }}
            className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-xs font-bold text-white backdrop-blur-sm transition-colors hover:bg-black/60"
          >
            ?
          </button>
        )}

        {/* Point counter */}
        {!showTutorial && corners.length > 0 && (
          <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg bg-black/50 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
            {corners.length} {corners.length === 1 ? "Punkt" : "Punkte"} gesetzt
            {!canFinish && " — mindestens 3 nötig"}
          </div>
        )}

        {/* ════════ Tutorial overlay ════════ */}
        {showTutorial && (
          <div
            className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-[2px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-4 w-full max-w-sm rounded-2xl bg-white px-6 py-7 text-center shadow-2xl">
              {/* Animated room SVG */}
              <TutorialAnimation />

              <h3 className="mt-4 font-display text-lg font-bold" style={{ color: "var(--dark)" }}>
                Markieren Sie Ihren Boden
              </h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--grey)" }}>
                Tippen Sie der Reihe nach auf die Kanten Ihres Bodens.
                Beginnen Sie in einer Ecke und gehen Sie im Uhrzeigersinn entlang der Bodenkante.
              </p>

              {/* Tips */}
              <div className="mt-5 flex gap-3 text-left">
                {TIPS.map((tip) => (
                  <div key={tip.title} className="flex-1 rounded-lg p-2.5" style={{ backgroundColor: "var(--oak-bg)" }}>
                    <div className="text-base">{tip.icon}</div>
                    <p className="mt-1 text-[11px] font-semibold" style={{ color: "var(--dark)" }}>{tip.title}</p>
                    <p className="mt-0.5 text-[10px] leading-tight" style={{ color: "var(--grey)" }}>{tip.text}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={(e) => { e.stopPropagation(); setShowTutorial(false); }}
                className="mt-5 w-full rounded-xl py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: "var(--oak)" }}
              >
                Verstanden, los geht&apos;s!
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Buttons */}
      {!showTutorial && (
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
      )}
    </div>
  );
}
