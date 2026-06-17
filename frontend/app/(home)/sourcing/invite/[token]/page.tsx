import { Metadata } from "next";
import { validateInviteToken } from "@/app/common/services/sourcing";
import { InviteApplicationForm } from "./_components/InviteApplicationForm";
import { AlertTriangle, Clock } from "lucide-react";

type Props = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const result = await validateInviteToken(token);
  if (result.success && result.data.is_active) {
    return {
      title: `Join ${result.data.company_name}'s Talent Network | TIAAGO`,
      description: `You've been invited to join ${result.data.company_name}'s ${result.data.category_name} talent community.`,
    };
  }
  return { title: "Talent Network Invite | TIAAGO" };
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params;
  const result = await validateInviteToken(token);

  if (!result.success) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Invalid Invite Link</h1>
          <p className="text-muted-foreground">
            This invite link is not valid. It may have been revoked or the URL is incorrect.
            Please contact the recruiter who shared this link with you.
          </p>
        </div>
      </div>
    );
  }

  if (!result.data.is_active) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center">
            <Clock className="h-8 w-8 text-warning" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Invite Expired</h1>
          <p className="text-muted-foreground">
            This invite link is no longer active. The talent pool may have been closed or
            the invite was deactivated. Please reach out to the recruiting team for a new link.
          </p>
        </div>
      </div>
    );
  }

  return (
    <InviteApplicationForm
      token={token}
      categoryName={result.data.category_name}
      companyName={result.data.company_name}
    />
  );
}
