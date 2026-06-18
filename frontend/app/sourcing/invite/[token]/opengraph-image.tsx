import { createOGImage, getApiUrl } from "@/app/common/utils/og";

export const alt = "TIAAGO Talent Pipeline Invite";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600;

type Props = { params: Promise<{ token: string }> };

export default async function OGImage({ params }: Props) {
  const { token } = await params;

  let subtitle = "Join a talent pipeline on TIAAGO";
  try {
    const res = await fetch(`${getApiUrl()}/sourcing/invite/${token}/`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const data = await res.json();
      if (data.company_name && data.category_name) {
        subtitle = `Join ${data.company_name}'s ${data.category_name} Pipeline`;
      }
    }
  } catch {}

  return createOGImage({
    headline: "You're Invited!",
    subtitle,
    illustrationPath: "assets/Invite-amico.svg",
    footerRight: "Hire Vetted Tech Talents in Africa",
  });
}
