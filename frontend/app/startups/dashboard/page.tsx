import {
  ArrowRight,
  CalendarCheck,
  FileText,
  FolderKanban,
  Mail,
  Search,
  Users,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { isThisMonth } from "date-fns";
import { LuExternalLink, LuPlus } from "react-icons/lu";

import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";

import { Job } from "@/app/common/types";
import SortIcon from "@/app/common/icons/SortIcon";
import { getJobs } from "@/app/common/services/jobs";
import ScrollArea from "@/app/common/components/ScrollArea";
import { getCurrentUser } from "@/app/common/services/profile";
import { getTeamRole } from "@/app/common/services/team";
import { cn, handleServerApiCallError } from "@/app/common/utils";
import StartupOnboardingCards from "./components/StartupOnboardingCards";
import { EmptyStateV3 } from "@/app/common/components/dashboard/EmptyState";

export const metadata = {
  title: "Dashboard",
};

const StartupDashboard = async () => {
  const errors: DisplayErrorMessagesProps["errors"] = [];

  // Fetch user, jobs, and role in parallel -- they are independent
  const [userRes, jobsRes, teamRoleData] = await Promise.all([
    getCurrentUser("startup"),
    getJobs(1, 5).catch(async e => {
      const error = await handleServerApiCallError(e);
      console.log("Get jobs error (startup dashboard): ", error);
      errors.push({
        message: error,
        title: "Error getting jobs",
      });
      return null;
    }),
    getTeamRole().catch(() => null),
  ]);
  const currentUser = userRes.currentUser;
  const teamRole = teamRoleData?.role ?? "admin";
  const canTakeActions = teamRole !== "viewer";
  const jobsPosted = jobsRes?.results || [];

  const activeJobsThisMonth = jobsPosted.filter(job => {
    const jobDate = new Date(job.date_created);
    return isThisMonth(jobDate) && job.job_status === "ACTIVE";
  });

  const stats = [
    {
      icon: Users,
      label: "Candidates Sourced",
      value: "0",
      unit: "total",
      gradient: "from-primary/20 to-primary/5",
      iconColor: "text-primary",
      borderColor: "border-primary/20",
    },
    {
      icon: FileText,
      label: "Assessments Created",
      value: "0",
      unit: "total",
      gradient: "from-info/20 to-info/5",
      iconColor: "text-info",
      borderColor: "border-info/20",
    },
    {
      icon: CalendarCheck,
      label: "Active Jobs",
      value: activeJobsThisMonth.length,
      unit: "this month",
      gradient: "from-success/20 to-success/5",
      iconColor: "text-success",
      borderColor: "border-success/20",
    },
    {
      icon: Mail,
      label: "Outreach Sent",
      value: "0",
      unit: "total",
      gradient: "from-warning/20 to-warning/5",
      iconColor: "text-warning",
      borderColor: "border-warning/20",
    },
  ];

  return (
    <>
      <DisplayErrorMessages errors={errors} />
      <StartupOnboardingCards isTeamMember={!!teamRoleData?.role} />
      <div className='flex justify-between items-center mb-8'>
        <h1 className='text-2xl font-switzer text-primary-black'>
          Welcome,{" "}
          <span className='font-semibold max-sm:block'>
            {currentUser.first_name}!👋🏻
          </span>
        </h1>
        {canTakeActions && (
          <Link
            href='/startups/dashboard/jobs/create'
            className='btn btn-primary min-h-[44px] h-11 font-medium'
          >
            <LuPlus className='text-base' /> Post a Job
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        {stats.map((stat, index) => (
          <div
            key={stat.label}
            className={`caard card-bordered rounded-lg animate-fade-in group hover:shadow-lg transition-all duration-300 border-l-4 ${stat.borderColor} overflow-hidden relative`}
          >
            <div
              className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-50`}
            />
            <div className='card-body p-5 relative'>
              <div className='flex items-center justify-between'>
                <div className='rounded-xl bg-background/80 backdrop-blur-sm p-3 shadow-sm'>
                  <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
                </div>
                {/* {index === 0 && pipelineCount > 0 && (
                  <Badge variant='success' className='text-xs'>
                    <TrendingUp className='h-3 w-3 mr-1' />
                    Active
                  </Badge>
                )} */}
              </div>
              <div className='mt-4'>
                <p className='text-sm font-medium text-muted-foreground'>
                  {stat.label}
                </p>
                <div className='flex items-baseline gap-1 mt-1'>
                  <span className='text-3xl font-bold text-foreground'>
                    {stat.value}
                  </span>
                  <span className='text-sm text-muted-foreground'>
                    {stat.unit}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className='grid gap-6 lg:grid-cols-2 mt-8'>
        {/* Source Candidates Card */}
        <div className='card border border-[#EAECF0] shadow-[0px_1px_3px_0px_rgba(16,24,40,0.10),0px_1px_2px_0px_rgba(16,24,40,0.06)] group overflow-hidden transition-all'>
          <div className='card-body p-6'>
            <div className='flex items-start gap-4'>
              <div className='rounded-xl bg-primary/10 p-3'>
                <Search className='h-6 w-6 text-primary' />
              </div>
              <div className='flex-1'>
                <h3 className='font-semibold text-foreground'>
                  Source Candidates
                </h3>
                <p className='mt-1 text-sm text-muted-foreground'>
                  Find qualified candidates based on skills, location, and
                  experience level.
                </p>
                <Link
                  href='/startups/dashboard/sourcing'
                  className='btn btn-sm h-10 btn-ghost border border-gray-200 bg-gray-100 mt-4'
                >
                  Start Sourcing
                  <ArrowRight className='ml-2 h-4 w-4 transition-transform group-hover:translate-x-1' />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Pipeline Card */}
        <div className='card border border-[#EAECF0] shadow-[0px_1px_3px_0px_rgba(16,24,40,0.10),0px_1px_2px_0px_rgba(16,24,40,0.06)] group overflow-hidden transition-all'>
          <div className='card-body p-6'>
            <div className='flex items-start gap-4'>
              <div className='rounded-xl bg-success/10 p-3'>
                <FolderKanban className='h-6 w-6 text-success' />
              </div>
              <div className='flex-1'>
                <div className='flex items-center gap-2'>
                  <h3 className='font-semibold text-foreground'>
                    Talent Pipeline
                  </h3>
                  <div className='badge badge-success'>{0} candidates</div>
                </div>
                <p className='mt-1 text-sm text-muted-foreground'>
                  Manage your sourced candidates and track their progress.
                </p>
                <Link
                  href='/startups/dashboard/pipeline'
                  className='mt-4 btn btn-sm h-10 btn-ghost border border-gray-200 bg-gray-100'
                >
                  View Pipeline
                  <ArrowRight className='ml-2 h-4 w-4 transition-transform group-hover:translate-x-1' />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <JobsTable jobs={jobsPosted} />
    </>
  );
};

export default StartupDashboard;

interface StatisticsCardProps {
  title: string;
  value: string | number;
  unit?: string;
  image: string;
  color: string;
}

const StatisticsCard: React.FC<StatisticsCardProps> = ({
  title,
  value,
  unit,
  image,
  color,
}) => {
  return (
    <div className='bg-white p-4 rounded-lg border border-[#EAECF0] shadow-[0px_1px_3px_0px_rgba(16,24,40,0.10),0px_1px_2px_0px_rgba(16,24,40,0.06)]'>
      <Image
        src={image}
        alt='image'
        width={50}
        height={50}
        className='object-cover'
      />

      <h3 className='text-[#6C757D] text-lg font-medium mt-6 mb-1'>{title}</h3>

      <h4 className={`flex items-baseline text-[28px] font-medium ${color} `}>
        <span className='text-4xl'>{value}</span>
        {!!unit && <span className='text-gray-900'>{unit}</span>}
      </h4>
    </div>
  );
};

const JobsTable = ({
  jobs = [],
  className,
}: {
  jobs: Job[];
  className?: string;
}) => {
  return (
    <div className='mt-8 flex-1 flex flex-col'>
      <div className='w-full rounded-t-lg pl-6 pr-2 h-20 bg-[#EBECEE] mt-8 flex items-center justify-between'>
        <h4 className='text-base md:text-lg text-gray-900 font-switzer font-semibold'>
          Jobs
        </h4>
        <div className='border-l flex items-center'>
          <button className='btn btn-sm btn-ghost bg-white mx-[14px]'>
            <SortIcon />
          </button>
          <Link
            href='/startups/dashboard/jobs/jobs-posted'
            className='btn btn-ghost bg-white'
          >
            View All
          </Link>
        </div>
      </div>

      <ScrollArea
        className={cn(
          "border mb-8 border-t-0 rounded-b-lg flex-1 max-lg:max-w-[calc(100svw_-_1.5rem)]",
          className
        )}
      >
        <table className='table table-zebra'>
          <thead>
            <tr className='text-xs text-gray-500 font-medium text-center'>
              <th className='max-sm:hidden'>S/N</th>
              <th>Role</th>
              <th>Interested Applicants</th>
              <th>Assessment Completed</th>
              {/* <th>Pre-Screening Interview</th> */}
              <th />
            </tr>
          </thead>
          <tbody className='text-xs font-medium text-[#2E2E2E]'>
            {jobs.length ? (
              <>
                {jobs.map((job, index) => (
                  <tr key={index} className='border-t text-center'>
                    <td className='max-sm:hidden'>{index + 1}</td>
                    <td className='font-semibold text-primary-black'>
                      {job.role_title}
                    </td>

                    <td>
                      <span className='text-[#3580B5] bg-[#EFF8FF] px-3 py-1 rounded-md whitespace-nowrap'>
                        {job.no_of_applications} talents applied
                      </span>
                    </td>
                    <td>{job.completed_assessments_count || 0}</td>
                    {/* <td>0</td> */}
                    <td className='flex items-center justify-between'>
                      <a
                        href={`/startups/dashboard/jobs/jobs-posted/${job.id}/applications`}
                        className='font-medium max-md:hidden text-primary'
                      >
                        View Applications
                      </a>
                      <Link target='_blank' href={`/jobs/${job.id}`}>
                        <LuExternalLink className='text-base text-[#7F7F7F]' />
                      </Link>
                    </td>
                  </tr>
                ))}
              </>
            ) : (
              <tr>
                <td colSpan={6}>
                  <EmptyStateV3 text='You are yet to post a job...' />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </ScrollArea>
    </div>
  );
};
