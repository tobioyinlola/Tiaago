import { LuListFilter, LuPlus } from "react-icons/lu";

import AddAssessmentModal, {
  addAssessmentModalId,
} from "./_components/AddAssessmentModal";
import StatCard from "./_components/StatCard";
import AssessmentCard from "./_components/AssessmentCard";
import { OpenModalByIdButton } from "@/app/common/components/Modal";
import { getAssessmentDurationInMinutes } from "@/app/common/utils";
import { getCompanyAssessments } from "@/app/common/services/assessment";
import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import { handleServerApiCallError } from "@/app/common/utils";

export const metadata = {
  title: "Assessment",
};

const AssessementsPage = async () => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const { count, results } = await getCompanyAssessments().catch(async e => {
    const error = await handleServerApiCallError(e);
    console.log("Get company assessments error (assessments page): ", error);
    errors.push({
      message: error,
      title: "Error getting company assessments",
    });
    return { count: 0, results: [] };
  });
  // console.log(results);

  const getAverageTime = () => {
    const totalMinutes = results.reduce(
      (acc, curr) => acc + (getAssessmentDurationInMinutes(curr) || 0),
      0
    );
    const avg = results.length ? totalMinutes / results.length : 0;
    const minutes = Math.abs(avg);
    const seconds = Math.abs((avg - minutes) * 60);
    return `${minutes}m ${seconds}s`;
  };

  const stats = [
    { title: "Total Number of Assessment", value: count },
    { title: "Number of completed Assessment", value: 0 },
    { title: "Number of ongoing Assessment", value: 0 },
    { title: "Average time on Assessment", value: getAverageTime() },
  ];
  return (
    <div className='text-black'>
      <DisplayErrorMessages errors={errors} />
      <div className='flex justify-between items-center mb-6'>
        <h1 className='text-2xl font-medium font-space-grotesk text-primaryBlack'>
          Assessment Statistics
        </h1>
        {/* <button className='btn btn-outline border-[#D0D5DD] text-[#344054] text-sm 
        font-medium hover:bg-[#344054] group'>
          <CalendarIcon className='group-hover:stroke-white' />
          Date
        </button> */}
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8'>
        {stats.map((stat, index) => (
          <StatCard key={index} title={stat.title} value={stat.value} />
        ))}
      </div>

      <div className='bg-white rounded-lg p-6'>
        <div className='sm:flex justify-between items-center mb-6'>
          <div>
            <h2 className='text-2xl font-medium font-space-grotesk text-primaryBlack'>
              Skill Assessment
            </h2>
            <p className='text-[#636568] text-sm md:text-base'>
              Add, edit, duplicate and archive assessments,
            </p>
          </div>
          <button
            className='mt-5 sm:mt:0 btn btn-outline border-primary
           text-[#344054] text-sm font-medium hover:bg-[#344054]'
          >
            <LuListFilter />
            Filter
          </button>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
          <OpenModalByIdButton
            modalId={addAssessmentModalId}
            className='border-2 rounded-lg p-6 flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:border-blue-500 transition-colors'
          >
            <div className='w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4'>
              <LuPlus className='text-2xl text-primary' />
            </div>
            <p className='font-medium'>Add Assessment</p>
            <p className='text-sm'>
              Click the button below to add a new assessment
            </p>
          </OpenModalByIdButton>

          {results.map((assessment, index) => (
            <AssessmentCard key={index} {...assessment} />
          ))}
        </div>
      </div>
      <AddAssessmentModal />
    </div>
  );
};

export default AssessementsPage;
