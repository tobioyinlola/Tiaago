import Image, { StaticImageData } from "next/image";

import PortfolioIcon from "@/public/assets/images/auth/PortfolioIcon.svg";
import ConnectionIcon from "@/public/assets/images/auth/connectionIcon.svg";
import AssessmentIcon from "@/public/assets/images/auth/AssessmentIcon.svg";
import CertificationIcon from "@/public/assets/images/auth/CertificationIcon.svg";

const CarouselItemOne = () => {
  return (
    <div className='z-[2] pt-10 w-full text-[#343A40]'>
      <MVPs />
      <h3 className='text-center text-4xl text-[40px] font-bold font-switzer max-w-[526px] mt-[72px] mx-auto'>
        Welcome To Tiaago
      </h3>
      <p className='text-center text-xl font-medium max-w-[526px] mt-6 mx-auto'>
        We connect vetted and verified talents with startups offering a
        launchpad for global growth.
      </p>
    </div>
  );
};

export default CarouselItemOne;

export type MVP = {
  image: StaticImageData;
  header: string;
  details: string;
  borderTop: string;
};

const MVPs = () => {
  const mvps: MVP[] = [
    {
      image: AssessmentIcon,
      header: "Assessment",
      details: "Skill level assessment of talents onboarded on the platform.",
      borderTop: "#5465FF",
    },
    {
      image: CertificationIcon,
      header: "Certification",
      details: "Validated skill levels with global certification",
      borderTop: "#FFB800",
    },
    {
      image: PortfolioIcon,
      header: "Portfolio",
      details: "An updated portfolio for talents showcasing their experience.",
      borderTop: "#2ECC71",
    },
    {
      image: ConnectionIcon,
      header: "Connection",
      details: "Seamless connection with talents, startup and organizations.",
      borderTop: "#4AB4FF",
    },
  ];
  return (
    <div className='w-[420px] m-auto flex flex-row flex-wrap gap-4 justify-center'>
      {mvps.map((mvp, index) => (
        <div
          key={mvp.header + index}
          className={`w-[200px] border-t-4 bg-white flex flex-col gap-2 p-3`}
          style={{ borderTopColor: mvp.borderTop }}
        >
          <Image src={mvp.image} alt='MVP Icon' />
          <h2 className='font-medium text-lg'>{mvp.header}</h2>
          <p className='text-sm'>{mvp.details}</p>
        </div>
      ))}
    </div>
  );
};
