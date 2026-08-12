"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

import { cn } from "../utils";

export type SlideOverProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  widthClassName?: string;
};

// A right-anchored slide-over drawer -- there was no precedent for this
// shape in the codebase (Modal.tsx is a centered <dialog>), needed here for
// the campaign builder's email-body editor so the rest of the sequence
// stays visible/scrollable behind it. Controlled via a plain `open` boolean
// rather than the native <dialog> element, since <dialog> doesn't support
// an off-canvas slide-in transition cleanly.
const SlideOver = ({ open, onClose, title, subtitle, children, footer, widthClassName = "max-w-xl" }: SlideOverProps) => {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-[100] flex justify-end transition-opacity duration-200",
        open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      )}
      aria-hidden={!open}
    >
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div
        className={cn(
          "relative h-full w-full bg-white shadow-2xl flex flex-col transition-transform duration-200 ease-out",
          widthClassName,
          open ? "translate-x-0" : "translate-x-full"
        )}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#E0E0E0] px-6 py-4 shrink-0">
          <div>
            <h3 className="text-base font-semibold text-[#1A3C5E]">{title}</h3>
            {subtitle && <p className="mt-0.5 text-xs text-[#9E9E9E]">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="rounded-full p-1.5 text-[#9E9E9E] hover:bg-[#F4F4F4] hover:text-[#444444]"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="shrink-0 border-t border-[#E0E0E0] px-6 py-4">{footer}</div>}
      </div>
    </div>,
    document.body
  );
};

export default SlideOver;
