"use client";

import {
  Root,
  Scrollbar,
  Thumb,
  Corner,
  Viewport,
} from "@radix-ui/react-scroll-area";
import { type PropsWithChildren } from "react";

import { cn } from "../utils";

type ScrollAreaProps = {
  id?: string;
  className?: string;
  verticalScrollClassName?: string;
  horizontalScrollClassName?: string;
  viewportAsChild?: boolean;
};

const scrollBarClass =
  "flex select-none touch-none p-0.5 bg-black/5 transition-colors duration-150 ease-out hover:bg-black/10 data-[orientation=vertical]:w-2.5 data-[orientation=horizontal]:flex-col data-[orientation=horizontal]:h-2.5 rounded-full";
const thumbClass =
  "flex-1 bg-[#84828E] rounded-[10px] relative before:content-[''] before:absolute before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:w-full before:h-full before:min-w-[44px] before:min-h-[44px]";

const ScrollArea = ({
  id,
  children,
  className,
  horizontalScrollClassName,
  verticalScrollClassName,
  viewportAsChild,
}: PropsWithChildren<ScrollAreaProps>) => {
  return (
    <Root className={cn("overflow-hidden bg-white", className)}>
      <Viewport id={id} asChild={viewportAsChild} className='w-full h-full'>
        {children}
      </Viewport>
      <Scrollbar
        className={cn(scrollBarClass, verticalScrollClassName)}
        orientation='vertical'
      >
        <Thumb className={thumbClass} />
      </Scrollbar>
      <Scrollbar
        className={cn(scrollBarClass, horizontalScrollClassName)}
        orientation='horizontal'
      >
        <Thumb className={thumbClass} />
      </Scrollbar>
      <Corner className='bg-black/20' />
    </Root>
  );
};

export default ScrollArea;
