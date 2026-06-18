import { createOGImage } from "@/app/common/utils/og";

export const alt = "TIAAGO Case Studies";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage() {
  return createOGImage({
    headline: "Success Stories",
    subtitle: "See how companies hire better with TIAAGO.",
    illustrationPath: "assets/undraw_leave-a-review_uj9v.svg",
  });
}
