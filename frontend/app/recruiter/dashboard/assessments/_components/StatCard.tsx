import { LucideIcon } from "lucide-react";

import { cn } from "@/app/common/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  tone?: "primary" | "success" | "info" | "warning";
}

const toneClassMap: Record<NonNullable<StatCardProps["tone"]>, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-badge-green-bg text-badge-green-text",
  info: "bg-badge-blue-bg text-badge-blue-text",
  warning: "bg-badge-purple-bg text-badge-purple-text",
};

const StatCard = ({ title, value, icon: Icon, tone = "primary" }: StatCardProps) => {
  return (
    <div className='bg-white p-6 rounded-2lg shadow-soft border border-[#EAECF0] flex flex-col gap-4 transition-shadow hover:shadow-card-hover'>
      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", toneClassMap[tone])}>
        <Icon className='w-5 h-5' />
      </div>
      <div>
        <p className='text-2xl font-semibold text-primaryBlack font-space-grotesk'>{value}</p>
        <h3 className='text-secondary-black text-sm mt-1'>{title}</h3>
      </div>
    </div>
  );
};

export default StatCard;
