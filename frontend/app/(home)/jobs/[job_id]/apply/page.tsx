import { Metadata } from "next";
import { notFound } from "next/navigation";

import { getPublicJob } from "@/app/common/services/jobs";
import { trackTalentNetworkClick } from "@/app/common/services/talent-network";
import GuestApplyForm from "./_components/GuestApplyForm";
import JobClosedNotice from "../_components/JobClosedNotice";

type Props = {
  params: Promise<{ job_id: string }>;
  searchParams: Promise<{ tn?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { job_id } = await params;
  const job = await getPublicJob(job_id).catch(() => null);
  if (!job) return { title: "Apply" };
  return { title: `Apply -- ${job.title} at ${job.company?.company_name || "TIAAGO"}` };
}

const ApplyPage = async ({ params, searchParams }: Props) => {
  const { job_id } = await params;
  const { tn } = await searchParams;
  const job = await getPublicJob(job_id).catch(() => null);
  if (!job) return notFound();
  if (job.job_status !== "ACTIVE") return <JobClosedNotice />;

  // Reached via a Talent Network job-match email -- record the click.
  // Awaited (though it can never throw) for the same reason trackJobView
  // is on the job details page: a fire-and-forget promise can get cut off
  // once the response is sent on some serverless/edge runtimes.
  if (tn) await trackTalentNetworkClick(tn);

  return <GuestApplyForm job={job} />;
};

export default ApplyPage;
