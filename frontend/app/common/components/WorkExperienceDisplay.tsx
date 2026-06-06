import { format } from "date-fns";
import { MdBusiness } from "react-icons/md";

import { cn } from "../utils";
import { TalentPortfolioWorkExperience } from "../types";

type WorkExperienceDisplayProps = {
  experience: TalentPortfolioWorkExperience;
  children?: React.ReactNode;
  className?: string;
};

const WorkExperienceDisplay = ({
  experience: { company_name, title, start_date, end_date, company_logo_url },
  children,
  className,
}: WorkExperienceDisplayProps) => {
  const startDate = format(new Date(start_date), "MMM yyyy");
  const endDate = end_date ? format(new Date(end_date), "MMM yyyy") : null;
  return (
    <div className={cn("flex gap-3 items-center", className)}>
      <div className='w-[50px] h-[50px] bg-gray-200 rounded-full flex items-center justify-center'>
        {company_logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={company_logo_url}
            alt={`${company_name} logo`}
            className='object-fit rounded-full'
          />
        ) : (
          <MdBusiness className='text-secondary-black' size={28} />
        )}
      </div>
      <div className='text-secondary-black font-medium text-sm'>
        <h5 className='text-primary-black text-base'>{title}</h5>
        <p>{company_name}</p>
      </div>
      <div className='ml-auto p-1 rounded-[4px] bg-[#E2E3E4] text-primary-black text-[10px]'>
        {startDate && endDate
          ? `${startDate} - ${endDate}`
          : startDate
          ? `${startDate} - Present`
          : ""}
      </div>
      {children}
    </div>
  );
};

export default WorkExperienceDisplay;
