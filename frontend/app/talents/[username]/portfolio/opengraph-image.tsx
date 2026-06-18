import { createOGImage, getApiUrl } from "@/app/common/utils/og";

export const alt = "Talent Portfolio on TIAAGO";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600;

type Props = { params: Promise<{ username: string }> };

export default async function OGImage({ params }: Props) {
  const { username } = await params;

  let headline = "Talent Portfolio";
  let subtitle = "View profile on TIAAGO";
  try {
    const res = await fetch(
      `${getApiUrl()}/jobs/portfolio/${username}/details`,
      { next: { revalidate: 3600 } }
    );
    if (res.ok) {
      const data = await res.json();
      headline = data.full_name || headline;
      const parts = [data.role?.title, data.country].filter(Boolean);
      if (parts.length) subtitle = parts.join(" · ");
    }
  } catch {}

  return createOGImage({
    headline,
    subtitle,
    illustrationPath: "assets/resume-script.svg",
    footerRight: "View Portfolio",
  });
}
