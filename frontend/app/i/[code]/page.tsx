import { Metadata } from "next";
import { redirect, notFound } from "next/navigation";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
).replace(/\/$/, "");

async function resolveCode(code: string) {
  try {
    const res = await fetch(
      `${API_URL}/api/sourcing/invite/resolve/${code}/`,
      { cache: "force-cache" }
    );
    if (!res.ok) return null;
    return (await res.json()) as {
      token: string;
      category_name: string;
      company_name: string;
    };
  } catch {
    return null;
  }
}

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const data = await resolveCode(code);
  if (data?.company_name) {
    const title = `Join ${data.company_name}'s Talent Network | TIAAGO`;
    const description = `You've been invited to join ${data.company_name}'s ${data.category_name} talent pipeline. Apply now on TIAAGO.`;
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        siteName: "TIAAGO",
        type: "website",
        images: [{ url: "/opengraph-image.png", width: 1200, height: 630 }],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: ["/opengraph-image.png"],
      },
    };
  }
  return { title: "Talent Network Invite | TIAAGO" };
}

export default async function ShortLinkRedirect({ params }: Props) {
  const { code } = await params;
  const data = await resolveCode(code);
  if (!data) notFound();
  redirect(`/sourcing/invite/${data.token}`);
}
