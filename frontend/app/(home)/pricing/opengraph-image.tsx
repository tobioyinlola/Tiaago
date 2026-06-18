import { createOGImage } from "@/app/common/utils/og";

export const alt = "TIAAGO Pricing";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage() {
  return createOGImage({
    headline: "Simple Pricing",
    subtitle: "Plans for every hiring need — from startups to staffing agencies.",
    illustrationPath: "assets/undraw_all-checked_d3u6.svg",
  });
}
