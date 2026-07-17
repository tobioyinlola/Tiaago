"use client";

import { useState } from "react";
import { X, AlertTriangle } from "lucide-react";

import { cn } from "@/app/common/utils";

export type AlertBannerProps = {
  id: string;
  title: string;
  description: string;
  count: number;
};

const AlertBanner = ({ id, title, description, count }: AlertBannerProps) => {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed || count === 0) return null;

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 mb-3"
      )}
    >
      <AlertTriangle className='h-5 w-5 text-amber-500 mt-0.5 shrink-0' />
      <div className='flex-1'>
        <p className='text-sm font-semibold text-amber-900'>
          {title} <span className='font-normal text-amber-700'>({count})</span>
        </p>
        <p className='text-xs text-amber-700 mt-0.5'>{description}</p>
      </div>
      <button
        type='button'
        onClick={() => setDismissed(true)}
        aria-label={`Dismiss ${title} alert`}
        className='text-amber-500 hover:text-amber-700 shrink-0'
      >
        <X className='h-4 w-4' />
      </button>
    </div>
  );
};

export default AlertBanner;
