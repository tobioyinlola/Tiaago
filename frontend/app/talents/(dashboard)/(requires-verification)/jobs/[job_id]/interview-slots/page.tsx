import { getPublicJobByPublicId } from "@/app/common/services/jobs";
import { getJobInterviewSlots } from "@/app/common/services/schedule";
import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import InterviewSlotPicker from "./_components/InterviewSlotPicker";

type Props = {
  params: Promise<{ job_id: string }>;
};

export const metadata = {
  title: "Pick your interview time",
};

const InterviewSlotsPage = async ({ params }: Props) => {
  const { job_id } = await params;
  const errors: DisplayErrorMessagesProps["errors"] = [];

  const [job, slotsRes] = await Promise.all([
    getPublicJobByPublicId(job_id),
    getJobInterviewSlots(job_id),
  ]);

  const slots = slotsRes.success ? slotsRes.data : [];
  if (!slotsRes.success) {
    errors.push({
      title: "Error getting interview slots",
      message: slotsRes.error,
    });
  }

  return (
    <div className='p-8 max-md:px-4 flex flex-col gap-6 sm:gap-8'>
      <div className='border-b border-gray-200 pb-1'>
        <h1 className='text-2xl font-semibold font-space-grotesk'>
          Pick your interview time
        </h1>
        {job && (
          <p className='text-sm text-secondary-black mt-1'>
            {job.title} at {job.company?.company_name}
          </p>
        )}
      </div>
      <DisplayErrorMessages errors={errors} />
      <InterviewSlotPicker jobId={job_id} initialSlots={slots} />
    </div>
  );
};

export default InterviewSlotsPage;
