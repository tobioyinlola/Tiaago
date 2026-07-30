"use client";

import { useEffect, useState } from "react";

import { cn } from "@/app/common/utils";

const formatElapsed = (ms: number) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const InterviewTimer = ({
  startedAt,
  durationMinutes,
}: {
  startedAt: number;
  durationMinutes: number;
}) => {
  const [now, setNow] = useState(startedAt);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const elapsedMs = now - startedAt;
  const targetMs = durationMinutes * 60 * 1000;
  const ratio = targetMs > 0 ? elapsedMs / targetMs : 0;

  return (
    <span
      className={cn(
        "font-mono text-[20px] tabular-nums",
        ratio >= 0.9 ? "text-red-400 animate-pulse" : ratio >= 0.8 ? "text-amber-400" : "text-white"
      )}
    >
      {formatElapsed(elapsedMs)}
    </span>
  );
};

export default InterviewTimer;
