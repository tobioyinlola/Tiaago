import { getGuestInterviewSlots } from "@/app/common/services/schedule";
import InterviewSlotPicker from "@/app/talents/(dashboard)/(requires-verification)/jobs/[job_id]/interview-slots/_components/InterviewSlotPicker";

type Props = {
  params: Promise<{ token: string }>;
};

export const metadata = {
  title: "Pick your interview time",
};

// No-login equivalent of the authenticated talent's interview-slots page --
// for a guest (account-less) applicant, reached via the token in their
// "Pick your interview time" email (see
// skill_assessment.tasks.send_interview_slot_selection_invite).
const GuestInterviewSlotsPage = async ({ params }: Props) => {
  const { token } = await params;
  const res = await getGuestInterviewSlots(token);

  if (!res.success) {
    return (
      <div className='p-8 max-md:px-4 flex flex-col gap-6 sm:gap-8 max-w-4xl mx-auto'>
        <div className='border-b border-gray-200 pb-1'>
          <h1 className='text-2xl font-semibold font-space-grotesk'>
            Pick your interview time
          </h1>
        </div>
        <div className='rounded-lg border border-dashed border-[#EAECF0] py-16 text-center'>
          <p className='text-sm text-secondary-black max-w-sm mx-auto'>
            {res.error ||
              "This link is invalid or has expired. Please reach out to the company directly."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className='p-8 max-md:px-4 flex flex-col gap-6 sm:gap-8 max-w-2xl mx-auto'>
      <div className='border-b border-gray-200 pb-1'>
        <h1 className='text-2xl font-semibold font-space-grotesk'>
          Pick your interview time
        </h1>
        <p className='text-sm text-secondary-black mt-1'>
          {res.data.job_title} at {res.data.company_name}
        </p>
      </div>
      <InterviewSlotPicker token={token} initialSlots={res.data.slots} />
    </div>
  );
};

export default GuestInterviewSlotsPage;
