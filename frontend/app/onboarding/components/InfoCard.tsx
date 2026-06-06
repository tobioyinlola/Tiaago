import Image from "next/image";
import { PiCheckCircleFill } from "react-icons/pi";

import { startupBenefits, talentBenefits } from "../constants";

const InfoCard = ({ as }: { as: "startup" | "talent" }) => {
  const isStartup = as === "startup";
  const benefits = isStartup ? startupBenefits : talentBenefits;
  const width = isStartup ? 150 : 100;
  return (
    <div className='bg-white rounded-[13px] pt-5 px-5 flex gap-1'>
      <div>
        <h4 className='text-base font-semibold'>
          Sign up as a <span className='capitalize'>{as}</span> to
        </h4>
        <ul className='mt-4 gap-3'>
          {benefits.map(benefit => (
            <li key={benefit} className='flex items-center gap-2'>
              <PiCheckCircleFill className='text-[#00B849] text-base' />
              <p className='text-sm font-medium text-[#999999]'>{benefit}</p>
            </li>
          ))}
        </ul>
      </div>
      <Image
        className='self-end max-md:hidden'
        src={`/assets/images/onbaording/form-icon-${as}.png`}
        alt={`${as} onboarding form icon`}
        width={width}
        height={width}
      />
    </div>
  );
};

export default InfoCard;
