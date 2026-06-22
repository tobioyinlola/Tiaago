"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "../utils";

type Tab = {
  name: string;
  label: string;
};

type ClientTabsProps = {
  tabs: readonly Tab[];
  defaultTab?: string;
  children: (activeTab: string) => React.ReactNode;
  className?: string;
};

const ClientTabs = ({ tabs, defaultTab, children, className }: ClientTabsProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || defaultTab || tabs[0]?.name || "";
  const validTab = tabs.some(t => t.name === initialTab) ? initialTab : tabs[0]?.name || "";
  const [activeTab, setActiveTab] = useState(validTab);

  const switchTab = (name: string) => {
    setActiveTab(name);
    router.replace(`?tab=${name}`, { scroll: false });
  };

  return (
    <div role='tablist' className={cn("tabs tabs-bordered pb-8", className)}>
      {tabs.map(({ label, name }) => (
        <button
          key={name}
          role='tab'
          type='button'
          onClick={() => switchTab(name)}
          className={cn(
            "tab !border-gray-200 text-sm font-medium text-gray-500 !w-max",
            name === activeTab && "tab-active !border-primary text-primary"
          )}
          aria-label={label}
        >
          <span className='md:hidden capitalize'>{name}</span>
          <span className='max-md:hidden'>{label}</span>
        </button>
      ))}
      <div
        role='tabpanel'
        className='tab-content py-8 border-0 border-t-2 border-gray-200 w-full'
      >
        {children(activeTab)}
      </div>
    </div>
  );
};

export default ClientTabs;
