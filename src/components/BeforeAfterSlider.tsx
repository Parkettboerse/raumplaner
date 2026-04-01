"use client";

import { useRef, useCallback, useEffect } from "react";

interface BeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
}

export default function BeforeAfterSlider({
  beforeImage,
  afterImage,
}: BeforeAfterSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const afterRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const labelBeforeRef = useRef<HTMLSpanElement>(null);
  const labelAfterRef = useRef<HTMLSpanElement>(null);
  const dragging = useRef(false);

  const updatePosition = useCallback((clientX: number) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    let pct = ((clientX - rect.left) / rect.width) * 100;
    pct = Math.max(2, Math.min(98, pct));

    // Direct DOM updates — no React re-render
    if (afterRef.current) {
      afterRef.current.style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
    }
    if (lineRef.current) {
      lineRef.current.style.left = `${pct}%`;
    }
    if (knobRef.current) {
      knobRef.current.style.left = `${pct}%`;
    }
    // Hide label when slider is near it
    if (labelBeforeRef.current) {
      labelBeforeRef.current.style.opacity = pct < 12 ? "0" : "1";
    }
    if (labelAfterRef.current) {
      labelAfterRef.current.style.opacity = pct > 88 ? "0" : "1";
    }
  }, []);

  const onPointerDown = useCallback(() => {
    dragging.current = true;
  }, []);

  const onPointerMove = useCallback(
    (clientX: number) => {
      if (!dragging.current) return;
      updatePosition(clientX);
    },
    [updatePosition]
  );

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  // Mouse events on container
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      onPointerDown();
      updatePosition(e.clientX);
    },
    [onPointerDown, updatePosition]
  );

  // Touch events on container
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      onPointerDown();
      updatePosition(e.touches[0].clientX);
    },
    [onPointerDown, updatePosition]
  );

  // Global move/up listeners for smooth dragging beyond container
  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      onPointerMove(e.clientX);
    }
    function handleMouseUp() {
      onPointerUp();
    }
    function handleTouchMove(e: TouchEvent) {
      if (dragging.current) {
        e.preventDefault();
        onPointerMove(e.touches[0].clientX);
      }
    }
    function handleTouchEnd() {
      onPointerUp();
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [onPointerMove, onPointerUp]);

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      role="slider"
      aria-label="Vorher-Nachher-Vergleich. Ziehen Sie den Regler um zwischen Vorher und Nachher zu wechseln."
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={50}
      className="relative select-none overflow-hidden"
      style={{ cursor: "col-resize", borderRadius: "var(--radius)", boxShadow: "0 16px 48px rgba(0,0,0,0.12)" }}
    >
      {/* After image (bottom layer — sets natural height) */}
      <img
        src={afterImage}
        alt="Nachher"
        draggable={false}
        className="relative z-[1] w-full"
        style={{ display: "block", height: "auto" }}
      />

      {/* Before image (top layer, clipped from left to slider position) */}
      <div
        ref={afterRef}
        className="absolute inset-0 z-[2]"
        style={{ clipPath: "inset(0 50% 0 0)" }}
      >
        <img
          src={beforeImage}
          alt="Vorher"
          draggable={false}
          className="w-full"
          style={{ display: "block", height: "auto" }}
        />
      </div>

      {/* Slider line */}
      <div
        ref={lineRef}
        className="absolute top-0 z-10 h-full w-[2px] -translate-x-1/2"
        style={{
          left: "50%",
          backgroundColor: "var(--white)",
          boxShadow: "0 0 12px rgba(0,0,0,0.3)",
        }}
      />

      {/* Slider knob */}
      <div
        ref={knobRef}
        className="absolute top-1/2 z-[11] flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white"
        style={{
          left: "50%",
          width: "44px", height: "44px",
          boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
        }}
      >
        <span
          className="select-none text-sm font-medium leading-none tracking-widest"
          style={{ color: "var(--dark)" }}
        >
          ‹ ›
        </span>
      </div>

      {/* Labels */}
      <span
        ref={labelBeforeRef}
        className="absolute left-3 top-3 z-[15] rounded-full text-[12px] font-semibold uppercase text-white backdrop-blur-[8px] transition-opacity duration-150"
        style={{ backgroundColor: "rgba(0,0,0,0.5)", padding: "6px 16px" }}
      >
        Vorher
      </span>
      <span
        ref={labelAfterRef}
        className="absolute right-3 top-3 z-[15] rounded-full text-[12px] font-semibold uppercase backdrop-blur-[8px] transition-opacity duration-150"
        style={{ backgroundColor: "var(--gold)", color: "var(--black)", padding: "6px 16px" }}
      >
        Nachher
      </span>
    </div>
  );
}
