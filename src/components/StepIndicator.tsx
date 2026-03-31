"use client";

const STEPS = [
  { num: 1, label: "FOTO" },
  { num: 2, label: "BODEN" },
  { num: 3, label: "ERGEBNIS" },
];

export default function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((step, i) => {
        const done = currentStep > step.num;
        const active = currentStep === step.num;
        return (
          <div key={step.num} className="flex items-center">
            {i > 0 && (
              <div className="h-[2px] w-10" style={{ backgroundColor: done ? "var(--black)" : "#eee" }} />
            )}
            <div className="flex flex-col items-center gap-1">
              <div
                className="flex h-[34px] w-[34px] items-center justify-center rounded-full text-[13px] font-bold transition-all duration-300"
                style={{
                  backgroundColor: done ? "var(--black)" : active ? "var(--gold)" : "#eee",
                  color: done ? "var(--gold)" : active ? "var(--black)" : "#bbb",
                  boxShadow: active ? "0 4px 14px var(--gold-glow)" : "none",
                }}
              >
                {done ? (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{color:"var(--gold)"}}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                ) : step.num}
              </div>
              <span className="hidden text-[10px] font-semibold uppercase tracking-[1px] sm:block" style={{ color: done ? "var(--dark)" : active ? "var(--gold)" : "#bbb" }}>
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
