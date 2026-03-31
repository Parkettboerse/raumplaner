"use client";

interface StepIndicatorProps {
  currentStep: number;
}

const STEPS = [
  { num: 1, label: "Foto" },
  { num: 2, label: "Boden" },
  { num: 3, label: "Vorschau" },
];

export default function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((step, i) => {
        const isDone = currentStep > step.num;
        const isActive = currentStep === step.num;
        return (
          <div key={step.num} className="flex items-center">
            {i > 0 && (
              <div
                className="h-px w-5 sm:w-8 transition-colors duration-300"
                style={{ backgroundColor: isDone ? "var(--green)" : isActive ? "var(--oak-light)" : "var(--grey-lighter)" }}
              />
            )}
            <div className="flex flex-col items-center gap-0.5">
              <div
                className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold transition-all duration-300"
                style={{
                  backgroundColor: isDone ? "var(--green)" : isActive ? "var(--oak)" : "var(--grey-lighter)",
                  color: isDone || isActive ? "var(--white)" : "var(--grey-light)",
                }}
              >
                {isDone ? (
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : step.num}
              </div>
              <span className="text-[10px] font-medium" style={{ color: isDone ? "var(--green)" : isActive ? "var(--oak)" : "var(--grey-light)" }}>
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
