import { Metadata } from "next";
import { notFound } from "next/navigation";

import { getPublicJob } from "@/app/common/services/jobs";
import { getCurrentUser } from "@/app/common/services/profile";
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

  // A signed-in talent applies through the same published journey, with their
  // account details instead of retyping them.
  const session = await getCurrentUser("talent", { allowNull: true }).catch(() => null);
  const talent = session?.currentUser;
  const signedIn = talent && talent.user_type === "T"
    ? {
        name: [talent.first_name, talent.last_name].filter(Boolean).join(" ") || talent.username,
        email: talent.email,
        hasResume: !!talent.resume,
      }
    : undefined;

  return <GuestApplyForm job={job} signedIn={signedIn} />;
};

export default ApplyPage;
