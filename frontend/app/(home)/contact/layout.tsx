import { Metadata } from "next";
import { PropsWithChildren } from "react";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with the TIAAGO team. We'd love to hear from you.",
  openGraph: { title: "Contact TIAAGO", description: "Get in touch with the TIAAGO team.", siteName: "TIAAGO", type: "website" },
  twitter: { card: "summary_large_image", title: "Contact TIAAGO", description: "Get in touch with the TIAAGO team." },
};

export default function ContactLayout({ children }: PropsWithChildren) {
  return <>{children}</>;
}
