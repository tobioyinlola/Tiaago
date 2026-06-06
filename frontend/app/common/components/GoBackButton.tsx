"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

import { cn } from "../utils";

const GoBackButton = ({ className }: { className?: string }) => {
  const router = useRouter();

  return (
    <button
      className={cn("btn btn-neutral", className)}
      onClick={() => router.back()}
    >
      <ArrowLeft />
      Go back
    </button>
  );
};

export default GoBackButton;
