"use client";

import { useState, useEffect, useRef } from "react";

interface ProcessingOverlayProps {
  floorName: string;
}

const STEPS = [
  "Bodenfläche analysiert",
  "Perspektive berechnet",
  "Textur wird eingesetzt",
  "Beleuchtung anpassen",
];

// Delays in ms before each step completes (cumulative from mount)
const STEP_DELAYS = [0, 2000, 5000, 8000];

export default function ProcessingOverlay({
  floorName,
}: ProcessingOverlayProps) {
  // completedCount: how many steps are done (0-4)
  const [completedCount, setCompletedCount] = useState(1); // step 0 is instant
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    // Steps 1..3 complete after their delays
    for (let i = 1; i < STEP_DELAYS.length; i++) {
      const t = setTimeout(() => {
        setCompletedCount(i + 1);
      }, STEP_DELAYS[i]);
      timers.current.push(t);
    }
    return () => {
      timers.current.forEach(clearTimeout);
    };
  }, []);

  function getStepState(index: number): "done" | "active" | "pending" {
    if (index < completedCount) return "done";
    if (index === completedCount) return "active";
    return "pending";
  }

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center rounded-xl" role="status" aria-live="polite" aria-label="Vorschau wird generiert">
      {/* Blur backdrop */}
      <div
        className="absolute inset-0 rounded-xl"
        style={{
          backdropFilter: "blur(3px)",
          WebkitBackdropFilter: "blur(3px)",
          backgroundColor: "rgba(255, 255, 255, 0.35)",
        }}
      />

      {/* Card */}
      <div
        className="relative z-10 w-full max-w-[340px] rounded-2xl bg-white px-8 py-9 text-center sm:px-11"
        style={{
          boxShadow:
            "0 8px 32px rgba(139, 105, 20, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06)",
        }}
      >
        {/* Spinner */}
        <div className="mb-5 flex justify-center">
          <div
            className="h-12 w-12 animate-spin rounded-full"
            style={{
              border: "3px solid var(--oak-pale)",
              borderTopColor: "var(--oak)",
            }}
          />
        </div>

        {/* Title */}
        <h3
          className="font-display text-lg font-semibold"
          style={{ color: "var(--dark)" }}
        >
          Ihre Vorschau wird erstellt...
        </h3>

        {/* Subtitle */}
        <p
          className="mt-1.5 text-[13px] leading-relaxed"
          style={{ color: "var(--grey)" }}
        >
          Unsere KI setzt{" "}
          <span className="font-medium" style={{ color: "var(--oak)" }}>
            {floorName}
          </span>{" "}
          in Ihren Raum ein
        </p>

        {/* Progress steps */}
        <div className="mt-6 space-y-3 text-left">
          {STEPS.map((label, i) => {
            const state = getStepState(i);
            return (
              <div key={i} className="flex items-center gap-2.5">
                {/* Dot */}
                {state === "done" && (
                  <span
                    className="inline-block h-[7px] w-[7px] shrink-0 rounded-full"
                    style={{ backgroundColor: "var(--green)" }}
                  />
                )}
                {state === "active" && (
                  <span className="relative inline-flex h-[7px] w-[7px] shrink-0">
                    <span
                      className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
                      style={{ backgroundColor: "var(--oak-light)" }}
                    />
                    <span
                      className="relative inline-flex h-[7px] w-[7px] rounded-full"
                      style={{
                        backgroundColor: "var(--oak)",
                        boxShadow: "0 0 6px rgba(139, 105, 20, 0.5)",
                      }}
                    />
                  </span>
                )}
                {state === "pending" && (
                  <span
                    className="inline-block h-[7px] w-[7px] shrink-0 rounded-full"
                    style={{ backgroundColor: "var(--oak-pale)" }}
                  />
                )}

                {/* Label */}
                <span
                  className="text-[13px] transition-colors duration-300"
                  style={{
                    color:
                      state === "done"
                        ? "var(--green)"
                        : state === "active"
                          ? "var(--oak)"
                          : "var(--grey-light)",
                    fontWeight: state === "active" ? 500 : 400,
                  }}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
