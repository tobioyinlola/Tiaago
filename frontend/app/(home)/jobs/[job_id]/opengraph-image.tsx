import { createOGImage, getApiUrl } from "@/app/common/utils/og";

export const alt = "Job Posting on TIAAGO";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600;

type Props = { params: Promise<{ job_id: string }> };

export default async function OGImage({ params }: Props) {
  const { job_id } = await params;

  let title = "Job Opportunity";
  let subtitle = "Apply now on TIAAGO";
  try {
    const res = await fetch(`${getApiUrl()}/jobs/${job_id}/`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const job = await res.json();
      title = job.title || title;
      const parts = [job.company?.company_name, job.location].filter(Boolean);
      if (parts.length) subtitle = parts.join(" · ");
    }
  } catch {}

  return createOGImage({
    headline: title,
    subtitle,
    illustrationPath: "assets/hiring-script.svg",
    footerRight: "Apply Now",
  });
}
