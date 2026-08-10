import { notFound } from "next/navigation";

import { getReport } from "@/app/common/services/reports";
import ReportView from "./_components/ReportView";

export const metadata = {
  title: "Report",
};

const ReportDetailPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const res = await getReport(id);
  if (!res.success) return notFound();

  return <ReportView reportId={id} initialReport={res.data} />;
};

export default ReportDetailPage;
