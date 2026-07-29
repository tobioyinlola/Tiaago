"use client";

import { useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import { cn } from "../utils";

// Isomorphic "are we past hydration?" check -- `document` doesn't exist
// during SSR, so the portal can't be created until the client takes over.
const subscribeToNothing = () => () => {};
const useIsMounted = () =>
  useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false
  );

export type SidePanelProps = {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  /** Sticky action bar pinned to the bottom of the panel. */
  footer?: React.ReactNode;
  /** Overrides the default half-viewport desktop width. */
  className?: string;
  disableBackdropClick?: boolean;
  id?: string;
};

/**
 * Right-hand slide-in sheet -- a half-page alternative to the centered
 * `<dialog>`-based Modal.
 *
 * It renders through a portal into `document.body` on purpose: callers sit
 * inside big forms (e.g. the create-assessment wizard), and any markup with
 * its own `<form>`/inputs nested inside another `<form>` is invalid HTML
 * that browsers silently mangle. Portalling sidesteps DOM nesting entirely,
 * so this is safe to mount from anywhere in the tree.
 *
 * The panel stays mounted while `open` is false (translated off-screen and
 * made inert) so opening/closing actually animates and so a caller's
 * in-progress local state survives a close.
 */
const SidePanel = ({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
  disableBackdropClick,
  id,
}: SidePanelProps) => {
  const mounted = useIsMounted();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      id={id}
      className={cn("fixed inset-0 z-[60]", !open && "pointer-events-none")}
      aria-hidden={!open}
    >
      <button
        type='button'
        aria-label='Close panel'
        tabIndex={open ? 0 : -1}
        disabled={disableBackdropClick}
        onClick={onClose}
        className={cn(
          "absolute inset-0 w-full h-full bg-black/30 backdrop-blur-[2px] transition-opacity duration-300 cursor-default",
          open ? "opacity-100" : "opacity-0"
        )}
      />

      <div
        role='dialog'
        aria-modal='true'
        className={cn(
          "absolute right-0 top-0 h-full w-full md:w-1/2 max-w-full bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full",
          className
        )}
      >
        <div className='flex items-start justify-between gap-4 px-6 py-5 border-b border-[#EAECF0] shrink-0'>
          <div>
            {!!title && <h2 className='text-xl font-semibold text-primaryBlack'>{title}</h2>}
            {!!description && <p className='text-sm text-[#9DA3A8] mt-1'>{description}</p>}
          </div>
          <button
            type='button'
            aria-label='close panel'
            tabIndex={open ? 0 : -1}
            onClick={onClose}
            className='btn btn-sm btn-circle btn-ghost text-black text-base shrink-0'
          >
            ✕
          </button>
        </div>

        <div className='flex-1 overflow-y-auto px-6 py-5 text-black'>{children}</div>

        {!!footer && (
          <div className='px-6 py-4 border-t border-[#EAECF0] bg-white shrink-0'>{footer}</div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default SidePanel;
