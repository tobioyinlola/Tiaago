"use client";
import Image from "next/image";
import Slider from "react-slick";

import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

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

const settings = {
  autoplay: true,
  dots: true,
  infinite: true,
  speed: 500,
  slidesToShow: 1,
  slidesToScroll: 1,
  appendDots: (dots: any) => (
    <div>
      <ul
        style={{
          display: "flex",
          flexDirection: "row",
          gap: "8px",
          justifyContent: "center",
        }}
      >
        {dots}
      </ul>
    </div>
  ),
  customPaging: () => (
    <div className='bg-[#d4d6fd] h-2 w-[17px] rounded-[8px]' />
  ),
};

const AuthCarousel = () => {
  return (
    <div className='relative max-md:hidden'>
      <div className='sticky top-0 bg-[linear-gradient(90deg,_#F8F9FA_3.18%,_rgba(222,226,230,0.35)_21.33%)] h-[100svh]'>
        <div className='relative pt-10 h-full'>
          <Image
            fill
            src='/assets/images/auth/Pattern-backdrop.png'
            alt='pattern bg'
            sizes='100vw'
            className='object-cover'
          />
          <Slider {...settings}>
            <CarouselItemOne />
            {items.map((item, i) => (
              <div
                key={i}
                className='z-[2] flex-col items-center justify-center w-full text-[#343A40] overflow-x-hidden'
              >
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
            ))}
          </Slider>
        </div>
      </div>
    </div>
  );
};

export default AuthCarousel;
