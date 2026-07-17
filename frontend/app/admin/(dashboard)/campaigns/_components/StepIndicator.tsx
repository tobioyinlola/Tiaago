const STEP_TITLES = ["Details", "Audience", "Template", "Customise", "Schedule", "Review and send"];

const StepIndicator = ({ step }: { step: number }) => {
  const totalSteps = STEP_TITLES.length;
  const progress = Math.round(((step + 1) / totalSteps) * 100);

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
        <span>
          Step {step + 1} of {totalSteps}
        </span>
        <span>{progress}% complete</span>
      </div>
      <div role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
      </div>
      <h2 className="text-lg font-semibold mt-3">{STEP_TITLES[step]}</h2>
    </div>
  );
};

export default StepIndicator;
