import { createOGImage } from "@/app/common/utils/og";

export const alt = "Contact TIAAGO";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage() {
  return createOGImage({
    headline: "Get in Touch",
    subtitle: "We'd love to hear from you — reach out to the TIAAGO team.",
    illustrationPath: "assets/Contact us-rafiki.svg",
  });
}
