"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "../utils";

interface DaisyButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  color?: "primary" | "secondary" | "accent" | "info" | "success" | "warning" | "error" | "ghost" | "link" | "neutral";
  size?: "lg" | "md" | "sm" | "xs";
  variant?: "outline" | "link";
  loading?: boolean;
  children?: ReactNode;
}

const DaisyButton = forwardRef<HTMLButtonElement, DaisyButtonProps>(
  ({ className, color, size, variant, loading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn("btn", color && `btn-${color}`, size && `btn-${size}`, variant && `btn-${variant}`, className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <span className="loading loading-spinner loading-sm" />}
        {children}
      </button>
    );
  }
);
DaisyButton.displayName = "DaisyButton";

export default DaisyButton;
