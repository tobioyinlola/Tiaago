import Image from "next/image";

import { cn } from "../utils";
import { TalentPortfolioTool } from "../types";

type TalentEducationDisplayProps = {
  tool: TalentPortfolioTool;
  children?: React.ReactNode;
  className?: string;
};

const TalentToolDisplay = ({
  tool: { name, category, icon },
  children,
  className,
}: TalentEducationDisplayProps) => {
  return (
    <div
      className={cn(
        "border border-[#BEC3C9] px-3 py-4 w-full rounded-2lg flex gap-4",
        className
      )}
    >
      {!!icon && (
        <Image
          src={icon}
          alt='Tool Icon'
          width={48}
          height={48}
          className='object-contain'
        />
      )}
      <div>
        <h3 className='text-base font-semibold text-[#23262F]'>{name}</h3>
        <p className='text-xs text-[#667085]'>{category}</p>
      </div>
      {children}
    </div>
  );
};

export default TalentToolDisplay;
