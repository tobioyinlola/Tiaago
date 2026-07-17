import Link from "next/link";
import "react-quill-new/dist/quill.snow.css";
import "react-phone-input-2/lib/style.css";

import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";

import EditJobForm from "../EditJobForm";
import { handleServerApiCallError } from "@/app/common/utils";
import { getCurrentUser } from "@/app/common/services/profile";
import { getCountries, getTalentRoles } from "@/app/common/services";
import { getJob } from "@/app/common/services/jobs";
import {
  getPaymentCards,
  getStripeClientSecret,
} from "@/app/common/services/subscription";

export const metadata = {
  title: "Edit Job",
  description: "Edit job details",
};

const EditJobPage = async ({
  params,
}: {
  params: Promise<{ job_id: string }>;
}) => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const resolvedParams = await params;
  const jobId = resolvedParams.job_id;

  const [{ currentUser }, groupedCountries, talentRoles, job, paymentCardsRes] =
    await Promise.all([
      getCurrentUser("recruiter"),
      getCountries(),
      getTalentRoles(),
      getJob(jobId).catch(async e => {
        const error = await handleServerApiCallError(e);
        console.log("Get job error (edit job): ", error);
        errors.push({
          message: error,
          title: "Error getting job",
        });
        return null;
      }),
      getPaymentCards(1, 1).catch(async e => {
        const error = await handleServerApiCallError(e);
        console.log("Get payment cards error (edit job): ", error);
        errors.push({
          message: error,
          title: "Error getting payment cards",
        });
        return { results: [] };
      }),
    ]);

  if (!job) {
    return (
      <>
        <div className='border-b w-full border-gray-200 pb-1 mb-8'>
          <div className='flex items-center justify-between'>
            <h1 className='text-2xl font-bold mb-1 font-space-grotesk'>
              Edit Job
            </h1>
            <Link
              href='/recruiter/dashboard/jobs/jobs-posted'
              className='btn btn-primary font-medium text-base max-sm:btn-sm'
            >
              Back to Jobs
            </Link>
          </div>
        </div>
        <div className='bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-4'>
          <p>
            Job not found or you don&apos;t have permission to edit this job.
          </p>
        </div>
        <DisplayErrorMessages errors={errors} />
      </>
    );
  }
  const hasAddedPaymentCard = paymentCardsRes?.results.length > 0;
  const paystackPublicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;
  const paystackEmail = currentUser.email;
  const usePaystack = currentUser.country.toLowerCase() === "nigeria";
  // const stripeClientSecret = (
  //   await getStripeClientSecret().catch(async e => {
  //     const error = await handleServerApiCallError(e);
  //     console.log("Get stripe client secret error (edit job): ", error);
  //     errors.push({
  //       message: error,
  //       title: "Error getting payment setup config data",
  //     });
  //     return { client_secret: "" };
  //   })
  // ).client_secret;

  return (
    <>
      <div className='border-b w-full border-gray-200 pb-1 mb-8'>
        <div className='flex items-center justify-between'>
          <h1 className='text-2xl font-bold mb-1 font-space-grotesk'>
            Edit Job
          </h1>
          <Link
            href='/recruiter/dashboard/jobs/jobs-posted'
            className='btn btn-primary font-medium text-base max-sm:btn-sm'
          >
            Back to Jobs
          </Link>
        </div>
        <h4 className='text-gray-900 text-base'>
          Update your job details below
        </h4>
      </div>
      <EditJobForm
        job={job}
        talentRoles={talentRoles}
        groupedCountries={groupedCountries}
        recruiterCountry={currentUser.country}
        hasAddedPaymentCard={hasAddedPaymentCard}
        usePaystack={usePaystack}
        // stripeClientSecret={stripeClientSecret}
        paystackPublicKey={paystackPublicKey!}
        paystackEmail={paystackEmail}
      />
      <DisplayErrorMessages errors={errors} />
    </>
  );
};

export default EditJobPage;
