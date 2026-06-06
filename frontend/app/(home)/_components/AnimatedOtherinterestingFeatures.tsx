"use client";

import React from "react";

const AnimatedOtherInterestingFeatures = ({
  features,
}: {
  features: { title: string; color: string }[];
}) => {
  const duplicatedFeatures = [...features, ...features];

  return (
    <div className='relative w-full max-w-[calc(100svw-2rem)] overflow-hidden bg-transparent py-4'>
      <div className='flex w-max animate-infinite-scroll hover:[animation-play-state:paused]'>
        {duplicatedFeatures.map((feature, index) => (
          <div
            key={index}
            className='mx-3 flex min-w-[220px] items-center justify-center gap-3 rounded-xl border border-white/5 bg-[#1E1E1E] p-4 transition-colors hover:bg-[#2A2A2A]'
          >
            <div
              className='h-2.5 w-2.5 shrink-0 rounded-full shadow-[0_0_8px] shadow-current'
              style={{
                backgroundColor: feature.color,
                color: feature.color,
              }}
            />
            <h6 className='font-onest text-sm font-medium text-gray-200'>
              {feature.title}
            </h6>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AnimatedOtherInterestingFeatures;
