import { redirect, notFound } from "next/navigation";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
).replace(/\/$/, "");

export default async function ShortLinkRedirect({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  try {
    const res = await fetch(`${API_URL}/api/sourcing/invite/resolve/${code}/`, {
      cache: "force-cache",
    });

    if (!res.ok) notFound();

    const data = await res.json();
    redirect(`/sourcing/invite/${data.token}`);
  } catch {
    notFound();
  }
}
