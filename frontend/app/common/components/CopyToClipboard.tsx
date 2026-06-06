"use client";

import { toast } from "sonner";
import { PropsWithChildren, useEffect, useState } from "react";
import { BiCheck, BiCopy } from "react-icons/bi";
import { cn } from "../utils";

type Props = PropsWithChildren<{
  text?: string;
  className?: string;
}>;

const CopyToClipboard = ({ text = "", children, className }: Props) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (copied) {
      setTimeout(() => {
        setCopied(false);
      }, 1500);
    }
  }, [copied]);

  return (
    <button
      className={cn(
        "flex items-center cursor-pointer justify-center p-[10px] text-gray-500 text-xl",
        copied && "text-success",
        className
      )}
      onClick={() => {
        navigator.clipboard
          .writeText(text)
          .then(() => {
            setCopied(true);
          })
          .catch((err: any) => {
            toast.error("Failed to copy");
            console.log(err);
          });
      }}
    >
      {copied ? <BiCheck /> : <BiCopy />}
      {children}
    </button>
  );
};

export default CopyToClipboard;
