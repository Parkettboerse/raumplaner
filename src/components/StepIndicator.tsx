"use client";

interface StepIndicatorProps {
  currentStep: number;
}

const STEPS = [
  { num: 1, label: "Foto" },
  { num: 2, label: "Markieren" },
  { num: 3, label: "Boden" },
  { num: 4, label: "Vorschau" },
];

export default function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((step, i) => {
        const isDone = currentStep > step.num;
        const isActive = currentStep === step.num;

        return (
          <div key={step.num} className="flex items-center">
            {/* Connecting line before (except first) */}
            {i > 0 && (
              <div
                className="h-0.5 w-6 sm:w-10 transition-colors duration-300"
                style={{
                  backgroundColor: isDone || isActive
                    ? currentStep > step.num
                      ? "var(--green)"
                      : "var(--oak-light)"
                    : "var(--oak-pale)",
                }}
              />
            )}

            {/* Step circle + label */}
            <div className="flex flex-col items-center gap-1">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-all duration-300"
                style={{
                  backgroundColor: isDone
                    ? "var(--green)"
                    : isActive
                      ? "var(--oak)"
                      : "var(--oak-pale)",
                  color: isDone || isActive ? "var(--white)" : "var(--grey-light)",
                  boxShadow: isActive
                    ? "0 2px 8px rgba(139, 105, 20, 0.35)"
                    : "none",
                }}
              >
                {isDone ? (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step.num
                )}
              </div>
              <span
                className="text-xs font-medium transition-colors duration-300"
                style={{
                  color: isDone
                    ? "var(--green)"
                    : isActive
                      ? "var(--oak)"
                      : "var(--grey-light)",
                }}
              >
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
