import { getPracticalBooking } from "@/app/common/services/schedule";
import PracticalBooking from "./_components/PracticalBooking";

type Props = { params: Promise<{ token: string }> };

export const metadata = { title: "Book your practical assessment" };

// No-login self-booking for a practical assessment, reached through the
// personal link the hiring team sends (jobs.views.PracticalBookingLinkView).
const PracticalBookingPage = async ({ params }: Props) => {
  const { token } = await params;
  const res = await getPracticalBooking(token);

  return (
    <div className='mx-auto flex max-w-2xl flex-col gap-6 p-8 max-md:px-4 sm:gap-8'>
      <div className='border-b border-gray-200 pb-1'>
        <h1 className='font-space-grotesk text-2xl font-semibold'>Book your practical assessment</h1>
        {res.success && <p className='mt-1 text-sm text-secondary-black'>{res.data.job_title} at {res.data.company_name}</p>}
      </div>
      {res.success ? (
        <PracticalBooking token={token} initial={res.data} />
      ) : (
        <div className='rounded-lg border border-dashed border-[#EAECF0] py-16 text-center'>
          <p className='mx-auto max-w-sm text-sm text-secondary-black'>{res.error || "This link is invalid or has expired. Please contact the company directly."}</p>
        </div>
      )}
    </div>
  );
};

export default PracticalBookingPage;
