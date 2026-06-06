"use client";
import { FaShareAlt } from "react-icons/fa";
import { RWebShare, RWebShareProps } from "react-web-share";

import { cn } from "@/app/common/utils";

type ShareButtonProps = Omit<RWebShareProps, "onClick" | "children"> & {
  className?: string;
  children?: React.ReactNode;
};

const ShareButton = ({ className, children, ...props }: ShareButtonProps) => {
  return (
    <RWebShare {...props}>
      {children ? (
        children
      ) : (
        <button className={cn("btn btn-primary text-2xl", className)}>
          <FaShareAlt />
          <p className='sr-only'>share</p>
        </button>
      )}
    </RWebShare>
  );
};

export default ShareButton;
