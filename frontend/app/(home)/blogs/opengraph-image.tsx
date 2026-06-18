import { createOGImage } from "@/app/common/utils/og";

export const alt = "TIAAGO Blog";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage() {
  return createOGImage({
    headline: "TIAAGO Blog",
    subtitle: "Insights on hiring, talent acquisition, and AI in recruitment.",
    illustrationPath: "assets/undraw_ai-generated-document_ykb4.svg",
  });
}
