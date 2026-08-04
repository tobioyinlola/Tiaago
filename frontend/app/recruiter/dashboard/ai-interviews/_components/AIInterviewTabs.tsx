import Link from "next/link";

import { cn } from "@/app/common/utils";
import type { AIInterviewListTab } from "@/app/common/services/ai-interviews";
import { AI_INTERVIEW_TABS } from "../ai-interviews.constants";

const AIInterviewTabs = ({
  active,
  counts,
}: {
  active: AIInterviewListTab;
  counts?: Record<AIInterviewListTab, number>;
}) => {
  return (
    <div className='flex gap-1 sm:gap-2 border-b border-[#EAECF0] overflow-x-auto'>
      {AI_INTERVIEW_TABS.map(({ name, label }) => {
        const isActive = name === active;
        const count = counts?.[name] ?? 0;
        return (
          <Link
            key={name}
            href={{ query: { tab: name } }}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex items-center gap-2 px-3 sm:px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors",
              isActive ? "border-primary text-primary" : "border-transparent text-secondary-black hover:text-primaryBlack"
            )}
          >
            {label}
            <span
              className={cn(
                "text-xs font-medium px-2 py-0.5 rounded-full",
                isActive ? "bg-primary/10 text-primary" : "bg-[#F5F6F7] text-secondary-black"
              )}
            >
              {count}
            </span>
          </Link>
        );
      })}
    </div>
  );
};

export default AIInterviewTabs;
