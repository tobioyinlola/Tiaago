import { createOGImage, getApiUrl } from "@/app/common/utils/og";

export const alt = "Company on TIAAGO";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600;

type Props = { params: Promise<{ id: string }> };

export default async function OGImage({ params }: Props) {
  const { id } = await params;

  let headline = "Company Profile";
  let subtitle = "Careers & Opportunities";
  try {
    const res = await fetch(`${getApiUrl()}/jobs/companies/${id}`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const data = await res.json();
      headline = data.company_name || headline;
      if (data.bio) subtitle = data.bio.slice(0, 100);
    }
  } catch {}

  return createOGImage({
    headline,
    subtitle,
    illustrationPath: "assets/profiling-script.svg",
    footerRight: "Explore Jobs",
  });
}
