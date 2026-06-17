"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ClientRedirect({ href }: { href: string }) {
  const router = useRouter();
  useEffect(() => {
    router.replace(href);
  }, [href, router]);
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-white">
      <div className="animate-spin w-8 h-8 border-3 border-primary border-t-transparent rounded-full" />
    </div>
  );
}
