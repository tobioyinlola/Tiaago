import Image from "next/image";
import { FiEdit2, FiTrash2 } from "react-icons/fi";

import { PaymentAccount } from "@/app/common/types";
import CustomBadge from "@/app/common/components/CustomBadge";

const PaymentAccountItem = ({ countryFlag, currency }: PaymentAccount) => {
  return (
    <div className='rounded-lg w-full flex items-center border border-gray-300 mb-3'>
      <div className='h-full py-[10px] pl-[14px] pr-3 border-r border-gray-300'>
        <Image
          src={countryFlag.svg}
          alt={countryFlag.alt}
          width={35}
          height={24}
        />
      </div>
      <div className='flex max-sm:flex-col ml-[14px] sm:py-[10px] sm:gap-2 flex-1'>
        <p className='text-gray-900 text-base'>
          {currency.name} ({currency.symbol})
        </p>
        <CustomBadge />
      </div>
      <button className='cursor-pointer mx-2' aria-label='delete'>
        <FiTrash2 className='text-xl text-gray-500 hover:text-gray-700' />
      </button>
      <button className='cursor-pointer mr-[14px] w-5 h-5' aria-label='edit'>
        <FiEdit2 className='text-xl text-gray-500 hover:text-gray-700' />
      </button>
    </div>
  );
};

export default PaymentAccountItem;
