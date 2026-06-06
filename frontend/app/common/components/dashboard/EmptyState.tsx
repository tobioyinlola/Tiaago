import Image from "next/image";

import { cn } from "@/app/common/utils";

const EmptyState = ({
  text = "No items here at the moment...",
  className = "",
  imgSrc = "/assets/icons/empty-state.svg",
  imgWidth = 95,
  imgHeight = 80,
}) => {
  return (
    <div
      className={cn(
        "pb-16 pt-24 flex flex-col items-center gap-12 text-base text-center text-gray-900 font-medium",
        className
      )}
    >
      <Image
        src={imgSrc}
        alt='empty state'
        width={imgWidth}
        height={imgHeight}
      />
      <p>{text}</p>
    </div>
  );
};

export const EmptyStateV3 = ({
  text = "No items here at the moment...",
  subText = "",
  className = "",
  imgSrc = "/assets/icons/empty-state-v3.svg",
  imgWidth = 107,
  imgHeight = 95,
}) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center text-lg text-center pb-16 pt-24 text-gray-900 font-medium",
        className
      )}
    >
      <Image
        src={imgSrc}
        alt='empty state'
        width={imgWidth}
        height={imgHeight}
      />
      <h6>{text}</h6>
      {!!subText && (
        <p className='font-normal text-base text-[#868A8D] mt-0.5'>{subText}</p>
      )}
    </div>
  );
};

export default EmptyState;
