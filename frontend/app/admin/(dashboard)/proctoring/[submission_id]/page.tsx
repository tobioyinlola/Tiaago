import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import { getProctoringReport } from "@/app/common/services/proctoring";
import { handleServerApiCallError } from "@/app/common/utils";
import ProctoringReportView from "@/app/common/components/dashboard/ProctoringReportView";

export const metadata = {
  title: "Proctoring Report",
};

const AdminProctoringSessionPage = async ({
  params,
}: {
  params: Promise<{ submission_id: string }>;
}) => {
  const { submission_id } = await params;
  const errors: DisplayErrorMessagesProps["errors"] = [];

  const report = await getProctoringReport(submission_id).catch(async e => {
    const error = await handleServerApiCallError(e);
    console.log("Get proctoring report error (admin proctoring detail): ", error);
    errors.push({ title: "Error getting proctoring report", message: error });
    return null;
  });

  return (
    <>
      <DisplayErrorMessages errors={errors} />
      <div className='border-b w-full border-border pb-1 mb-6'>
        <Link href='/admin/proctoring' className='inline-flex items-center gap-1 text-sm text-primary mb-2'>
          <ChevronLeft className='h-4 w-4' /> Back to Proctoring
        </Link>
        {report && (
          <>
            <h1 className='text-2xl font-bold mb-1 font-space-grotesk'>{report.candidate_name}</h1>
            <h4 className='text-foreground text-sm md:text-base'>
              {report.job_title}
              {report.company_name ? ` · ${report.company_name}` : ""}
            </h4>
          </>
        )}
      </div>

      {report && <ProctoringReportView report={report} />}
    </>
  );
};

export default AdminProctoringSessionPage;
