"use client";

const STEPS = [
  { num: 1, label: "Foto" },
  { num: 2, label: "Boden" },
  { num: 3, label: "Vorschau" },
];

export default function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
      {STEPS.map((step, i) => {
        const done = currentStep > step.num;
        const active = currentStep === step.num;
        return (
          <div key={step.num} style={{ display: "contents" }}>
            {i > 0 && (
              <div style={{ width: 40, height: 2, background: done ? "#C8A415" : "#333", margin: "0 10px", marginBottom: 18 }} />
            )}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{
                width: 34, height: 34, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 700,
                background: done ? "#C8A415" : active ? "#C8A415" : "#222",
                color: done ? "#0D0D0D" : active ? "#0D0D0D" : "#666",
                boxShadow: active ? "0 4px 14px rgba(200,164,21,0.35)" : "none",
                transition: "all .3s",
              }}>
                {done ? "✓" : step.num}
              </div>
              <span style={{ fontSize: 10, marginTop: 5, color: done || active ? "#C8A415" : "#555", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
