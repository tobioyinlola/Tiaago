"use client";
import { useEffect, useState } from "react";
import { useWindowSize } from "usehooks-ts";
import { BiChevronLeft } from "react-icons/bi";

import { cn, isValueOrClose } from "../../utils";

const arrowClassName =
  "btn btn-primary btn-circle btn-xs md:w-[42px] md:h-[42px] disabled:cursor-not-allowed disabled:bg-[#F3F3F3] disabled:text-black md:text-4xl text-2xl";

type ScrollInfo = {
  scrollLeft: number;
  scrollWidth: number;
  clientWidth: number;
};

const CarouselControls = ({
  id,
  distance = 400,
  className,
  buttonClassName,
}: {
  id: string;
  distance?: number;
  className?: string;
  buttonClassName?: string;
}) => {
  const [scrollInfo, setScrollInfo] = useState<ScrollInfo>();
  const { width } = useWindowSize();
  useEffect(() => {
    const slider = document.getElementById(id);
    const getScrollInfo = () => {
      const slider = document.getElementById(id);
      if (!slider) return;
      setScrollInfo({
        scrollLeft: slider.scrollLeft,
        scrollWidth: slider.scrollWidth,
        clientWidth: slider.clientWidth,
      });
    };
    getScrollInfo();
    slider?.addEventListener("scroll", getScrollInfo);
    return () => {
      slider?.removeEventListener("scroll", getScrollInfo);
    };
  }, [id, width]);

  const slide = (distance: number) => {
    const slider = document.getElementById(id);
    if (slider) slider.scrollLeft += distance;
  };
  const leftDisabled = (scrollInfo?.scrollLeft ?? 0) === 0;
  const rightDisabled =
    !!scrollInfo &&
    isValueOrClose(
      Math.floor(scrollInfo.scrollLeft),
      scrollInfo.scrollWidth - scrollInfo.clientWidth,
      2
    );
  return (
    <div
      className={cn(
        "flex items-center gap-2",
        leftDisabled && rightDisabled && "hidden",
        className
      )}
    >
      <button
        className={cn(arrowClassName, buttonClassName)}
        onClick={() => slide(-distance)}
        disabled={leftDisabled}
      >
        <BiChevronLeft />
      </button>
      <button
        className={cn(arrowClassName, buttonClassName)}
        onClick={() => slide(distance)}
        disabled={rightDisabled}
      >
        <BiChevronLeft className='transform rotate-180' />
      </button>
    </div>
  );
};

export default CarouselControls;
