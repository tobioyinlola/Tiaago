import Link from "next/link";
import { LuArrowUpRight } from "react-icons/lu";

import { cn } from "../utils";
import { TalentPortfolioProject } from "../types";

type ProjectDisplayProps = {
  project: TalentPortfolioProject;
  className?: string;
  children?: React.ReactNode;
};

const ProjectDisplay = ({
  project,
  className,
  children,
}: ProjectDisplayProps) => {
  return (
    <div
      className={cn(
        "rounded-xl border-[#EBEBEB] border bg-[#EBEBEB] shadow-[0px_5px_50px_0px_rgba(0,67,101,0.08)]",
        className
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={project.image ?? "/assets/images/default-portfolio-banner.png"}
        alt={project.name}
        className='w-full h-[300px] object-cover rounded-t-xl'
      />
      <div className='flex items-center justify-between gap-3 flex-wrap px-6 py-4 rounded-b-xl bg-[#FFFFFF80]'>
        <h6 className='text-lg text-[#23262F] font-medium'>{project.name}</h6>
        {/* {children ? (
          children
        ) : ( */}
        <div className='flex items-center gap-2'>
          <Link target='_blank' href={project.link}>
            <LuArrowUpRight className='text-2xl text-[#141B34]' />
          </Link>
          {children}
        </div>
        {/* )} */}
      </div>
    </div>
  );
};

export default ProjectDisplay;
