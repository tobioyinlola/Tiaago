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
    const title = `Join ${data.company_name}'s ${data.category_name} Pipeline | TIAAGO`;
    const description = `${data.company_name} is hiring through TIAAGO. Join their ${data.category_name} talent pipeline and get discovered.`;
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        siteName: "TIAAGO",
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
      },
    };
  }
  return {
    title: "Talent Pipeline Invite | TIAAGO",
    description:
      "You've been invited to join a talent pipeline on TIAAGO. Apply now to get discovered by top startups.",
  };
}

export default async function ShortLinkRedirect({ params }: Props) {
  const { code } = await params;
  const data = await resolveCode(code);
  if (!data) notFound();
  redirect(`/sourcing/invite/${data.token}`);
}
