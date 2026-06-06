import { EmptyStateV3 } from "@/app/common/components/dashboard/EmptyState";

export const metadata = {
  title: "Question Bank",
};

const QuestionBank = async () => {
  return (
    <div className='flex-1 flex flex-col'>
      <div className='border-b w-full border-gray-200 pb-1 mb-8'>
        <h1 className='text-2xl font-bold mb-1 font-space-grotesk'>
          Question Bank
        </h1>
        <h4 className='text-gray-900 text-base'>
          Explore our collection of expertly curated questions for comprehensive
          assessment preparation.
        </h4>
      </div>

      {/* coming soon */}
      <div className='flex-1 flex justify-center items-center'>
        <EmptyStateV3
          text='Coming soon'
          subText='This feature is coming soon'
          imgHeight={180}
          imgWidth={180}
          imgSrc='/assets/icons/event-empty-state.svg'
          // imgSrc='/assets/icons/cert-empty-state.svg'
        />
      </div>
    </div>
  );
};

export default QuestionBank;
