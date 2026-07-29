"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { cn } from "../utils";
import InfoCircleIcon from "../icons/InfoCircleIcon";
import info_direct from "../../../public/assets/images/companies/Polygon 20.png";

/** How long the bubble stays up after the (i) is clicked. */
const AUTO_DISMISS_MS = 3500;

/** The (i) icon next to a form section heading plus its explanatory bubble.
 * The bubble is hidden until the icon is clicked, then flashes for a few
 * seconds and auto-dismisses (clicking again while it's up hides it early).
 * Renders as a fragment so the icon/arrow/bubble sit directly in the calling
 * heading row's flex layout. */
const InfoTooltip = ({ description }: { description?: string }) => {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPendingDismiss = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    []
  );

  if (!description) return null;

  const handleClick = () => {
    clearPendingDismiss();
    if (visible) {
      setVisible(false);
      return;
    }
    setVisible(true);
    timeoutRef.current = setTimeout(() => setVisible(false), AUTO_DISMISS_MS);
  };

  return (
    <>
      <button
        type='button'
        onClick={handleClick}
        aria-expanded={visible}
        aria-label='Show more information'
        className='flex items-center leading-none'
      >
        <InfoCircleIcon className='text-secondary-black' />
      </button>
      <Image
        src={info_direct}
        alt=''
        aria-hidden
        className={cn("w-[36px] h-[28px]", !visible && "hidden")}
      />
      <div
        role='tooltip'
        className={cn(
          "bg-[#9DA3A8] shadow-[#00000040] md:max-w-[446px] items-center justify-center px-3 py-2 rounded-md",
          visible ? "flex" : "hidden"
        )}
      >
        <p className='text-sm text-white italic'>{description}</p>
      </div>
    </>
  );
};

export default InfoTooltip;
