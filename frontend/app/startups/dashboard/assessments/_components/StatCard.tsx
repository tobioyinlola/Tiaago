import { PiDotsThreeVerticalBold } from "react-icons/pi";

interface StatCardProps {
  title: string;
  value: string | number;
}

const StatCard = ({ title, value }: StatCardProps) => {
  return (
    <div className='bg-white p-6 rounded-lg shadow-md flex flex-col justify-between'>
      <div className='flex justify-between items-start mb-4'>
        <h3 className='text-primaryBlack text-base font-medium'>{title}</h3>
        <button className='text-gray-400 hover:text-gray-600'>
          <PiDotsThreeVerticalBold className='text-xl' />
        </button>
      </div>
      <p className='text-2xl font-medium text-primary'>{value}</p>
    </div>
  );
};

export default StatCard;