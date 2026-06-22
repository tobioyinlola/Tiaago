"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";

import { cn } from "@/app/common/utils";
import CarouselItemOne from "./CarouselItemOne";

const items = [
  {
    image: "/assets/images/auth/talent-dashboard.png",
    alt: "Dashboard Img",
    title: "Get Connected to remote gigs today.",
    description:
      "We help companies build top-tier teams by hiring, developing and managing tech talent remotely.",
  },
  {
    image: "/assets/images/auth/Users.svg",
    alt: "Image groups",
    title: "Get Connected to top-tier talents globally",
    description:
      "We help companies build top-tier teams by hiring, developing and managing tech talent remotely.",
  },
];

const TOTAL_SLIDES = 1 + items.length; // CarouselItemOne + items
const AUTOPLAY_MS = 4000;

const AuthCarousel = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const scrollToSlide = useCallback((index: number) => {
    const container = scrollRef.current;
    if (!container) return;
    const slideWidth = container.offsetWidth;
    container.scrollTo({ left: slideWidth * index, behavior: "smooth" });
  }, []);

  // Track active slide via scroll position
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const handleScroll = () => {
      const slideWidth = container.offsetWidth;
      if (slideWidth === 0) return;
      const index = Math.round(container.scrollLeft / slideWidth);
      setActiveIndex(Math.min(index, TOTAL_SLIDES - 1));
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  // Autoplay
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % TOTAL_SLIDES;
        scrollToSlide(next);
        return next;
      });
    }, AUTOPLAY_MS);
    return () => clearInterval(interval);
  }, [scrollToSlide]);

  return (
    <div className='relative max-md:hidden'>
      <div className='sticky top-0 bg-[linear-gradient(90deg,_#F8F9FA_3.18%,_rgba(222,226,230,0.35)_21.33%)] h-[100svh]'>
        <div className='relative pt-10 h-full flex flex-col'>
          <Image
            fill
            src='/assets/images/auth/Pattern-backdrop.png'
            alt='pattern bg'
            sizes='100vw'
            className='object-cover'
          />
          {/* Scroll-snap carousel */}
          <style>{`.auth-carousel-track::-webkit-scrollbar { display: none; }`}</style>
          <div
            ref={scrollRef}
            className='auth-carousel-track flex overflow-x-auto flex-1'
            style={{
              scrollSnapType: "x mandatory",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {/* Slide 1: CarouselItemOne */}
            <div
              className='flex-shrink-0 w-full'
              style={{ scrollSnapAlign: "start" }}
            >
              <CarouselItemOne />
            </div>
            {/* Dynamic slides */}
            {items.map((item, i) => (
              <div
                key={i}
                className='flex-shrink-0 w-full'
                style={{ scrollSnapAlign: "start" }}
              >
                <div className='z-[2] flex-col items-center justify-center w-full text-[#343A40] overflow-x-hidden'>
                  <div
                    className={cn(
                      "relative h-[400px] w-[500px] mx-auto",
                      !i && "-mr-[20%] w-[700px]"
                    )}
                  >
                    <Image
                      src={item.image}
                      alt={item.alt}
                      fill
                      sizes='100vw'
                      className='object-contain'
                    />
                  </div>
                  <h3 className='text-center text-4xl text-[40px] font-bold font-switzer max-w-[526px] mt-[72px] mx-auto'>
                    {item.title}
                  </h3>
                  <p className='text-center text-xl font-medium max-w-[526px] mt-6 mx-auto'>
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {/* Dot indicators */}
          <div className='relative z-[2] flex flex-row gap-2 justify-center pb-8'>
            {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
              <button
                key={i}
                onClick={() => scrollToSlide(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={cn(
                  "h-2 w-[17px] rounded-[8px] transition-colors duration-300",
                  i === activeIndex ? "bg-[#5465FF]" : "bg-[#d4d6fd]"
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthCarousel;
