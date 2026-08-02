import { Metadata } from "next";
import { notFound } from "next/navigation";

import { getPublicJob } from "@/app/common/services/jobs";
import GuestApplyForm from "./_components/GuestApplyForm";
import JobClosedNotice from "../_components/JobClosedNotice";

type Props = { params: Promise<{ job_id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { job_id } = await params;
  const job = await getPublicJob(job_id).catch(() => null);
  if (!job) return { title: "Apply" };
  return { title: `Apply -- ${job.title} at ${job.company?.company_name || "TIAAGO"}` };
}

const ApplyPage = async ({ params }: Props) => {
  const { job_id } = await params;
  const job = await getPublicJob(job_id).catch(() => null);
  if (!job) return notFound();
  if (job.job_status !== "ACTIVE") return <JobClosedNotice />;

  return <GuestApplyForm job={job} />;
};

export default ApplyPage;
