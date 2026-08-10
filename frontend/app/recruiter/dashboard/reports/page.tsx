import Link from "next/link";
import { FileBarChart, CheckCircle2, Clock, CalendarDays, Plus } from "lucide-react";

import StatCard from "../assessments/_components/StatCard";
import { getReports } from "@/app/common/services/reports";
import ServerPagination from "@/app/common/components/ServerPagination";
import { EmptyStateV3 } from "@/app/common/components/dashboard/EmptyState";
import { ISearchParams } from "@/app/common/types";
import ReportCard from "./_components/ReportCard";

export const metadata = {
  title: "Reports",
};

const ReportsPage = async ({
  searchParams,
}: {
  searchParams: Promise<ISearchParams>;
}) => {
  const resolvedSearchParams = await searchParams;
  const _page = resolvedSearchParams.page ? parseInt(resolvedSearchParams.page as string) : 1;
  const page = isNaN(_page) ? 1 : _page;

  const pageRes = await getReports(page);
  const results = pageRes?.results ?? [];
  const count = pageRes?.count ?? 0;

  const readyCount = results.filter(r => r.status === "READY").length;
  const generatingCount = results.filter(r => r.status === "GENERATING").length;
  const now = new Date();
  const thisMonthCount = results.filter(r => {
    const created = new Date(r.created_at);
    return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
  }).length;

  const stats = [
    { title: "Total reports", value: count, icon: FileBarChart, tone: "primary" as const },
    { title: "Ready", value: readyCount, icon: CheckCircle2, tone: "success" as const },
    { title: "Generating", value: generatingCount, icon: Clock, tone: "warning" as const },
    { title: "This month", value: thisMonthCount, icon: CalendarDays, tone: "info" as const },
  ];

  return (
    <div className='text-black'>
      <div className='flex justify-between items-center mb-6'>
        <div>
          <h1 className='text-2xl font-semibold font-space-grotesk text-primaryBlack'>Reports</h1>
          <p className='text-secondary-black text-sm mt-1'>
            Hiring performance reports generated from your pipeline data.
          </p>
        </div>
        <Link
          href='/recruiter/dashboard/reports/new'
          className='btn btn-primary text-white gap-2 rounded-lg'
        >
          <Plus className='w-4 h-4' />
          Generate Report
        </Link>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8'>
        {stats.map((stat, index) => (
          <StatCard key={index} title={stat.title} value={stat.value} icon={stat.icon} tone={stat.tone} />
        ))}
      </div>

      <div className='bg-white rounded-2lg p-6 border border-[#EAECF0]'>
        {results.length === 0 ? (
          <>
            <EmptyStateV3
              text='No reports yet'
              subText='Generate a report to see your hiring performance data'
            />
            <div className='flex justify-center'>
              <Link href='/recruiter/dashboard/reports/new' className='btn btn-primary text-white gap-2 rounded-lg'>
                <Plus className='w-4 h-4' />
                Generate Report
              </Link>
            </div>
          </>
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
            {results.map(report => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        )}
        {!!pageRes && <ServerPagination pagedResource={pageRes} searchParams={resolvedSearchParams} />}
      </div>
    </div>
  );
};

export default ReportsPage;
