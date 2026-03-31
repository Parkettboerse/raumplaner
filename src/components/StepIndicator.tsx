"use client";

const STEPS = [
  { num: 1, label: "Foto" },
  { num: 2, label: "Boden" },
  { num: 3, label: "Vorschau" },
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
              <div className="relative h-[3px] w-8 overflow-hidden rounded-full sm:w-12" style={{ backgroundColor: "var(--grey-border)" }}>
                <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-500" style={{
                  width: done ? "100%" : active ? "50%" : "0%",
                  background: done ? "var(--black)" : "linear-gradient(90deg, var(--gold), var(--gold-hover))",
                }} />
              </div>
            )}
            <div className="flex flex-col items-center gap-1">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-300"
                style={{
                  background: done ? "var(--black)" : active ? "linear-gradient(135deg, #C8A415, #D4B84A)" : "var(--white)",
                  color: done || active ? "var(--white)" : "var(--grey-light)",
                  border: !done && !active ? "2px solid var(--grey-border)" : "none",
                  boxShadow: active ? "0 3px 12px var(--gold-glow)" : "none",
                }}
              >
                {done ? (
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                ) : step.num}
              </div>
              <span className="hidden text-[11px] font-medium sm:block" style={{ color: done ? "var(--black)" : active ? "var(--gold)" : "var(--grey-light)" }}>
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
