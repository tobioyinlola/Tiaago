import { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  formatPrice,
  handleServerApiCallError,
  jobSalaryTypeToLabel,
  jobTypeEnumToLabel,
} from "@/app/common/utils";
import { getJob } from "@/app/common/services/jobs";
import { DeactivateJob } from "../../components/ApproveJob";
import CustomBadge from "@/app/common/components/CustomBadge";

type Props = {
  params: Promise<{ job_id?: string }>;
};

export const generateMetadata = async ({
  params,
}: Props): Promise<Metadata> => {
  const { job_id } = await params;
  return {
    title: `Review Job #${job_id}`,
  };
};

const Tags = ({ tags }: { tags: string[] }) => {
  const colors = [
    "#33BFFF",
    "#29CC39",
    "#E62E7B",
    "#FF6633",
    "#8833FF",
    "#FFCB33",
    "#CC7429",
    "#2EE6CA",
  ];
  return (
    <div className='flex flex-wrap gap-2'>
      {tags.map((tag, i) => {
        const color = colors[i % colors.length];
        return (
          <CustomBadge
            key={tag}
            hideDot
            style={{
              backgroundColor: `${color}0D`,
              color,
            }}
            text={tag}
          />
        );
      })}
    </div>
  );
};

const JobReviewPage = async ({ params }: Props) => {
  const { job_id } = await params;
  if (typeof job_id !== "string") return notFound();
  const job = await getJob(job_id).catch(async e => {
    const error = await handleServerApiCallError(e);
    console.log("Get job error (admin job review page): ", error);
    return null;
  });
  if (!job) return notFound();
  const [min_salary, max_salary] = (job.payment_range ?? "")
    .split("-")
    .map(s => s.trim())
    .map(s => parseInt(s));
  const sections = [
    {
      title: "Job Details",
      items: [
        { title: "Job Title", value: job.title },
        { title: "Job Tags", value: job.tags },
        { title: "Job Role", value: job.role },
      ],
    },
    {
      title: "Salary Details",
      items: [
        {
          title: "Salary Type",
          value: jobSalaryTypeToLabel(job.salary_duration),
        },
        {
          title: "Minimum Salary",
          value: isNaN(min_salary)
            ? "-"
            : formatPrice({
                price: min_salary,
                currencyCode: job.payment_currency,
              }),
        },
        {
          title: "Maximum Salary",
          value: isNaN(max_salary)
            ? "-"
            : formatPrice({
                price: max_salary,
                currencyCode: job.payment_currency,
              }),
        },
      ],
    },
    {
      title: "Advanced Information",
      items: [
        { title: "Experience", value: `${job.experience} years` },
        { title: "Job Type", value: jobTypeEnumToLabel(job.job_type) },
      ],
    },
    {
      title: "Job Location & Benefits",
      items: [{ title: "Location", value: job.location }],
    },
  ];
  return (
    <>
      <div className='flex justify-between items-center border-b pb-3'>
        <h1 className='text-2xl font-semibold'>Job #{job.id}</h1>
        <DeactivateJob id={job.id} deactivated={job.job_status !== "ACTIVE"} />
      </div>
      {sections.map(({ items, title }) => (
        <div className='mt-8' key={title}>
          <div className='w-full bg-[#D9DDFF] p-6'>
            <h4 className='text-lg font-semibold'>{title}</h4>
          </div>
          <div className='p-6 grid grid-cols-1 md:grid-cols-2 gap-6'>
            {items.map(({ title, value }) => (
              <div
                key={title}
                className='flex items-center justify-between p-6 border border-[#EAECF0] rounded-lg text-base font-medium'
              >
                <h5>{title}</h5>
                {Array.isArray(value) ? (
                  <Tags tags={value} />
                ) : (
                  <p className='text-[#23262F] capitalize'>{value}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className='my-8'>
        <div className='w-full bg-[#D9DDFF] p-6'>
          <h4 className='text-lg font-semibold'>Job Description</h4>
        </div>
        <div className='p-6 m-6 border border-[#EAECF0] rounded-lg text-base'>
          <h5 className='font-medium mb-6'>Job Description</h5>
          <div
            className='text-[#101828]'
            dangerouslySetInnerHTML={{
              __html: job.description,
            }}
          />
        </div>
      </div>
    </>
  );
};

export default JobReviewPage;
