import Link from "next/link";
import { ShieldX } from "lucide-react";

export default function AccessDenied({
  title = "Access Restricted",
  message = "You do not have permission to view this page. Contact your team admin for access.",
  backHref = "/startups/dashboard",
  backLabel = "Go to Dashboard",
}: {
  title?: string;
  message?: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="max-w-sm w-full text-center space-y-5 px-4">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-error/10 flex items-center justify-center">
          <ShieldX className="h-8 w-8 text-error" />
        </div>
        <div>
          <h2 className="text-xl font-semibold font-space-grotesk text-foreground">
            {title}
          </h2>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            {message}
          </p>
        </div>
        <Link
          href={backHref}
          className="btn btn-primary text-white w-full max-w-[200px]"
        >
          {backLabel}
        </Link>
      </div>
    </div>
  );
}
