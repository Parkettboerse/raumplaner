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
              <div className="h-px w-6 sm:w-8" style={{ backgroundColor: done ? "var(--black)" : "var(--grey-border)" }} />
            )}
            <div className="flex flex-col items-center gap-0.5">
              <div
                className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold"
                style={{
                  backgroundColor: done ? "var(--black)" : active ? "var(--gold)" : "var(--grey-bg)",
                  color: done || active ? "var(--white)" : "var(--grey-light)",
                }}
              >
                {done ? (
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                ) : step.num}
              </div>
              <span className="hidden text-[10px] font-medium sm:block" style={{ color: done ? "var(--black)" : active ? "var(--gold)" : "var(--grey-light)" }}>
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
