"use client";

import { useMultiStep } from "../../store/useMultiStep";
import { cn } from "../../utils";

const StepIndicator = ({ active }: { active: boolean }) => (
  <div
    className='rounded-full bg-[#DCE4EE] w-fit'
    style={{
      boxShadow: "0px 0px 0px 4px rgba(255, 255, 255, 0.16)",
    }}
  >
    {active ? (
      <svg
        xmlns='http://www.w3.org/2000/svg'
        width='36'
        height='36'
        viewBox='0 0 36 36'
        fill='none'
      >
        <rect
          width='36'
          height='36'
          rx='20'
          fill='url(#paint0_linear_251_489)'
        />
        <circle cx='18' cy='18' r='4' fill='white' />
        <defs>
          <linearGradient
            id='paint0_linear_251_489'
            x1='19.1559'
            y1='0.131823'
            x2='18.2916'
            y2='44.2488'
            gradientUnits='userSpaceOnUse'
          >
            <stop stopColor='#5465FF' />
            <stop offset='1' stopColor='#1C3477' />
          </linearGradient>
        </defs>
      </svg>
    ) : (
      <svg
        xmlns='http://www.w3.org/2000/svg'
        width='36'
        height='36'
        viewBox='0 0 36 36'
        fill='none'
      >
        <circle cx='18' cy='18' r='4' fill='white' />
      </svg>
    )}
  </div>
);

const FormSteps = ({
  steps,
  className,
  disableNavigation,
}: {
  steps: { title: string; description: string }[];
  className?: string;
  disableNavigation?: boolean;
}) => {
  const { step: activeStep, setStep: setActiveStep } = useMultiStep();
  return (
    <div className={cn(className)}>
      {steps.map(({ title, description }, index) => (
        <div key={title} className='max-md:flex items-center'>
          <div className='flex items-center gap-2 md:gap-10 max-md:flex-col'>
            <button
              className='cursor-pointer disabled:cursor-default'
              disabled={disableNavigation || activeStep <= index}
              onClick={() => setActiveStep(index as typeof activeStep)}
            >
              <StepIndicator active={activeStep >= index} />
            </button>
            <div>
              <h6 className='text-sm font-semibold max-md:text-black max-md:text-center'>
                {title}
              </h6>
              <p className='text-sm text-[#DADBD8] max-md:hidden'>
                {description}
              </p>
            </div>
          </div>
          {index !== steps.length - 1 && (
            <hr
              className={cn(
                "w-14 md:w-0.5 h-0.5 md:h-14 bg-gray-200 md:ml-4 md:my-3 self-start max-md:mt-6",
                {
                  "max-md:-mr-4 max-md:-ml-7": index % 2 !== 0,
                  "max-md:-ml-4 max-md:-mr-7": index % 2 === 0,
                }
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
};

export default FormSteps;
