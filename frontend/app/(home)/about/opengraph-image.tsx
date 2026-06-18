import { createOGImage } from "@/app/common/utils/og";

export const alt = "About TIAAGO";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage() {
  return createOGImage({
    headline: "About TIAAGO",
    subtitle: "The OS for Hiring — AI-powered hiring infrastructure for recruiters and agencies.",
    illustrationPath: "assets/undraw_contact-us_s4jn.svg",
  });
}
