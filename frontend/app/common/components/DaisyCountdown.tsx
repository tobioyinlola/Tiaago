"use client";

import { cn } from "../utils";

const DaisyCountdown = ({
  value,
  className,
}: {
  value: number;
  className?: string;
}) => {
  return (
    <span className={cn("countdown font-mono", className)}>
      <span style={{ "--value": Math.min(99, Math.max(0, value)) } as React.CSSProperties} />
    </span>
  );
};

export default DaisyCountdown;
