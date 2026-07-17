import Link from "next/link";

import { getCurrentUser } from "@/app/common/services/profile";
import TicketSubmitForm from "./_components/TicketSubmitForm";

export const metadata = {
  title: "Support",
};

const SupportPage = async () => {
  await getCurrentUser("recruiter");

  return (
    <>
      <div className="border-b w-full border-border pb-1 mb-6 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold mb-1 font-space-grotesk">Support</h1>
          <h4 className="text-foreground text-sm md:text-base">
            Tell us what&apos;s going on and we&apos;ll get back to you by email.
          </h4>
        </div>
        <Link href="/recruiter/dashboard/support/tickets" className="text-sm text-primary hover:underline">
          View my tickets →
        </Link>
      </div>
      <TicketSubmitForm />
    </>
  );
};

export default SupportPage;
