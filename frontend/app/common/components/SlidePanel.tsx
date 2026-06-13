"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { LuX } from "react-icons/lu";

import { cn } from "../utils";
import ScrollArea from "./ScrollArea";

type SlidePanelProps = {
  open: boolean;
  onClose: () => void;
  id?: string;
  title?: string;
  children: React.ReactNode;
  className?: string;
};

const SlidePanel = ({
  open,
  onClose,
  id,
  title,
  children,
  className,
}: SlidePanelProps) => {
  const [render, setRender] = useState(false);
  const [show, setShow] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement as HTMLElement;
      setRender(true);
      document.body.style.overflow = "hidden";
    } else {
      setShow(false);
    }
  }, [open]);

  useEffect(() => {
    if (render && open) {
      const outer = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setShow(true);
          closeRef.current?.focus();
        });
      });
      return () => cancelAnimationFrame(outer);
    }
  }, [render, open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  useEffect(() => {
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleTransitionEnd = (e: React.TransitionEvent) => {
    if (
      e.target === e.currentTarget &&
      e.propertyName === "transform" &&
      !open
    ) {
      setRender(false);
      document.body.style.overflow = "";
      triggerRef.current?.focus();
      triggerRef.current = null;
    }
  };

  if (!render) return null;

  return createPortal(
    <div
      id={id}
      role='dialog'
      aria-modal='true'
      aria-label={title}
      className='fixed inset-0 z-50'
    >
      <div
        className={cn(
          "fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-200",
          show ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
        aria-hidden='true'
      />
      <div
        className={cn(
          "fixed inset-y-0 right-0 w-full max-w-md bg-card shadow-lg flex flex-col transition-transform duration-200 ease-out",
          show ? "translate-x-0" : "translate-x-full",
          className
        )}
        onTransitionEnd={handleTransitionEnd}
      >
        <div className='flex items-center justify-between border-b border-border px-5 py-4 shrink-0'>
          {title && (
            <h2 className='text-base font-semibold text-foreground'>
              {title}
            </h2>
          )}
          <button
            ref={closeRef}
            type='button'
            onClick={onClose}
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
    </div>,
    document.body
  );
};

export default SlidePanel;
