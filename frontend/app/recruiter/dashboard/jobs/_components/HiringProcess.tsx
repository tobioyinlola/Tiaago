import { cn } from "@/app/common/utils";

const manualText = [
  { id: "1", text: "Create or Attach Assessments" },
  { id: "2", text: "Manually Review All Resumes" },
  { id: "3", text: "Screen Every Applicant" },
];

const aiText = [
  { id: "1", text: "Automated Applicant Screening" },
  { id: "2", text: "Customized Assessments" },
  { id: "3", text: "Instant Resume Analysis" },
];

const HiringProcess = ({
  hiringProcess,
  setHiringProcess,
  isAtLastStep,
}: {
  hiringProcess: string;
  setHiringProcess: (process: string) => void;
  isAtLastStep: boolean;
}) => {
  const isHireWithAI = hiringProcess === "With AI";
  return (
    <div className='flex flex-col md:flex-row  md:items-stretch gap-5'>
      {/* Hire with manuakl */}
      {/* <label
        className={cn(
          "flex flex-col justify-between cursor-not-allowed shadow-sm shadow-[#00000040] rounded-[10px] md:max-w-[355px] w-full",
          isAtLastStep && isHireWithAI && "hidden"
        )}
      >
        <div className='flex items-center justify-between gap-5 p-7 pr-3 bg-[#F5F5F5] border-b border-[#EAECF0] rounded-t-[10px] min-h-[100px]'>
          <div>
            <h4 className='text-base font-medium text-[#344054] mb-0.5'>
              Hire Manually
            </h4>
            <p className='text-xs text-[#899197]'>
              Take full control of your hiring process
            </p>
          </div>

          <input
            type='radio'
            className={cn(
              hiringProcess === "Manually"
                ? "checkbox checkbox-primary w-[16px] h-[16px]"
                : "radio radio-primary radio-xs"
            )}
            checked={hiringProcess === "Manually"}
            onChange={() => setHiringProcess("Manually")}
            disabled
          />
        </div>

        <ul className='list-disc space-y-2 py-6 px-4 list-inside'>
          {manualText.map(manual => (
            <li
              key={manual.id}
              className='text-secondary-black text-sm font-medium'
            >
              {manual.text}
            </li>
          ))}
        </ul>
      </label> */}

      {/* Hiring with ai */}
      <label
        className={cn(
          "flex flex-col justify-between cursor-pointer shadow-sm shadow-[#00000040] rounded-[10px] md:max-w-[355px] w-full",
          isAtLastStep && !isHireWithAI && "hidden"
        )}
      >
        <div className='flex items-center justify-between gap-5 py-5 pl-7 pr-3 bg-[#FFF0F0] border-b border-[#EAECF0] rounded-t-[10px] min-h-[100px]'>
          <div>
            <div className='flex items-center gap-[2px]'>
              <svg
                xmlns='http://www.w3.org/2000/svg'
                width='16'
                height='16'
                viewBox='0 0 16 16'
                fill='none'
              >
                <path
                  d='M2 8C5 8 8 5 8 2C8 5 11 8 14 8C11 8 8 11 8 14C8 11 5 8 2 8Z'
                  stroke='#B53535'
                  strokeLinejoin='round'
                />
                <path
                  d='M1.33325 12.9997C1.88881 12.9997 2.99992 11.8885 2.99992 11.333C2.99992 11.8885 4.11103 12.9997 4.66659 12.9997C4.11103 12.9997 2.99992 14.1108 2.99992 14.6663C2.99992 14.1108 1.88881 12.9997 1.33325 12.9997Z'
                  stroke='#B53535'
                  strokeLinejoin='round'
                />
                <path
                  d='M10.6667 3.33301C11.3334 3.33301 12.6667 1.99967 12.6667 1.33301C12.6667 1.99967 14.0001 3.33301 14.6667 3.33301C14.0001 3.33301 12.6667 4.66634 12.6667 5.33301C12.6667 4.66634 11.3334 3.33301 10.6667 3.33301Z'
                  stroke='#B53535'
                  strokeLinejoin='round'
                />
              </svg>
              <h4 className='text-base font-medium text-[#B53535]'>
                Hire with AI
              </h4>
            </div>
            <p className='text-[12px] text-[#899197]'>
              Supercharge your hiring process with our AI Hiring Manager
            </p>
          </div>

          <div className=''>
            <input
              type='checkbox'
              className='checkbox checkbox-primary w-[16px] h-[16px]'
              checked={isHireWithAI}
              onChange={() =>
                setHiringProcess(hiringProcess === "With AI" ? "" : "With AI")
              }
            />
          </div>
        </div>

        <ul className='list-disc space-y-2 py-6 px-4 list-inside'>
          {aiText.map(ai => (
            <li
              key={ai.id}
              className='text-secondary-black text-sm font-medium'
            >
              {ai.text}
            </li>
          ))}
        </ul>
      </label>
    </div>
  );
};

export default HiringProcess;
