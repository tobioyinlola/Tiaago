import { HiMiniInformationCircle } from "react-icons/hi2";

const UnapprovedDisplay = () => {
  return (
    <div className='flex flex-col items-center justify-center h-full min-h-[calc(100svh-5rem)]'>
      <HiMiniInformationCircle className='text-8xl text-primary' />
      <h1 className='text-3xl font-bold mb-3'>Your account is under review</h1>
      <p className='text-gray-600'>
        Your account is currently under review. You will be notified once your
        account is approved.
      </p>
    </div>
  );
};

export default UnapprovedDisplay;
