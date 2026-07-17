"use client";

import { AlertTriangle } from "lucide-react";

import DaisyButton from "@/app/common/components/DaisyButton";

type ProctoringWarningOverlayProps = {
  open: boolean;
  title: string;
  message: string;
  actionLabel: string;
  onAction: () => void;
};

/** Dark scrim, centered card, amber warning icon, single dismiss button --
 * matches the app's existing modal style (see UpgradeModal.tsx). Reused for
 * tab-return, fullscreen-exit, and devtools-detected interrupts. */
const ProctoringWarningOverlay = ({ open, title, message, actionLabel, onAction }: ProctoringWarningOverlayProps) => {
  if (!open) return null;

  return (
    <div
      className='fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm'
      role='alertdialog'
      aria-modal='true'
      aria-labelledby='proctoring-warning-title'
    >
      <div className='relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl'>
        <div className='h-2 w-full bg-warning' />
        <div className='p-6 sm:p-8 text-center'>
          <div className='mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-warning/10'>
            <AlertTriangle className='h-7 w-7 text-warning' />
          </div>
          <h2 id='proctoring-warning-title' className='mb-2 text-xl font-bold text-primary-black'>
            {title}
          </h2>
          <p className='mb-6 text-sm leading-relaxed text-secondary-black'>{message}</p>
          <DaisyButton color='primary' className='w-full text-white' onClick={onAction}>
            {actionLabel}
          </DaisyButton>
        </div>
      </div>
    </div>
  );
};

export default ProctoringWarningOverlay;
