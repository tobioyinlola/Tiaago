const StepIndicator = ({
  step,
  totalSteps,
  title,
  description,
}: {
  step: number;
  totalSteps: number;
  title: string;
  description: string;
}) => {
  const progress = Math.round(((step + 1) / totalSteps) * 100);

  return (
    <div className='space-y-4'>
      <div className='space-y-2'>
        <div className='flex items-center justify-between text-xs text-muted-foreground'>
          <span className='font-medium'>
            Step {step + 1} of {totalSteps}
          </span>
          <span>{progress}% complete</span>
        </div>
        <div
          role='progressbar'
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label='Job posting progress'
          className='h-1.5 w-full rounded-full bg-muted'
        >
          <div
            className='h-full rounded-full bg-primary transition-all duration-300'
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <div>
        <h2 className='text-xl font-bold font-space-grotesk'>{title}</h2>
        <p className='text-sm text-muted-foreground'>{description}</p>
      </div>
    </div>
  );
};

export default StepIndicator;
