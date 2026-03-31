"use client";

const STEPS = [
  { num: 1, label: "Foto" },
  { num: 2, label: "Boden" },
  { num: 3, label: "Vorschau" },
];

export default function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="sbar">
      {STEPS.map((step, i) => {
        const done = currentStep > step.num;
        const active = currentStep === step.num;
        return (
          <div key={step.num} style={{ display: "contents" }}>
            {i > 0 && <div className={`sline${done ? " done" : ""}`} />}
            <div className="sg">
              <div className={`sn${done ? " done" : active ? " on" : " off"}`}>
                {done ? "✓" : step.num}
              </div>
              <div className={`sl${active ? " on" : ""}`}>{step.label}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
