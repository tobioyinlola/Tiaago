"use client";

import { type RefObject } from "react";
import { LuX } from "react-icons/lu";

import { cn } from "../utils";
import ScrollArea from "./ScrollArea";

type SlidePanelProps = {
  panelRef: RefObject<HTMLDialogElement>;
  id?: string;
  title?: string;
  children: React.ReactNode;
  className?: string;
};

const SlidePanel = ({
  panelRef,
  id,
  title,
  children,
  className,
}: SlidePanelProps) => {
  return (
    <dialog
      ref={panelRef}
      id={id}
      className='fixed inset-0 m-0 h-full w-full max-h-none max-w-none border-none bg-transparent p-0 backdrop:bg-black/30 backdrop:backdrop-blur-sm'
    >
      <div
        className='flex h-full w-full justify-end'
        onClick={() => panelRef.current?.close()}
      >
        <div
          className={cn(
            "h-full w-full max-w-md bg-card shadow-lg animate-slide-in-from-right flex flex-col",
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className='flex items-center justify-between border-b border-border px-5 py-4 shrink-0'>
            {title && (
              <h2 className='text-base font-semibold text-foreground'>
                {title}
              </h2>
            )}
            <button
              type='button'
              onClick={() => panelRef.current?.close()}
              className='ml-auto rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
              aria-label='Close panel'
            >
              <LuX className='h-4 w-4' />
            </button>
          </div>
          <ScrollArea className='flex-1 bg-card'>
            <div className='p-5'>{children}</div>
          </ScrollArea>
        </div>
      </div>
    </dialog>
  );
};

export default SlidePanel;
