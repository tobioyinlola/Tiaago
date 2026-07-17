import { getAssessmentInvite } from "@/app/common/services/assessment-invite";
import { InviteFlowProvider } from "./_components/InviteFlowProvider";

export const metadata = {
  title: "Assessment Invite",
};

type Props = {
  children: React.ReactNode;
  params: Promise<{ token: string }>;
};

const AssessmentInviteLayout = async ({ children, params }: Props) => {
  const { token } = await params;
  const result = await getAssessmentInvite(token);

  if (!result.success) {
    return (
      <div className='min-h-screen w-full bg-[#0B1220] text-white flex items-center justify-center px-6'>
        <div className='max-w-md w-full bg-white/[0.04] border border-white/10 rounded-2xl p-8 text-center'>
          <h1 className='text-2xl font-bold mb-2'>Invite link invalid</h1>
          <p className='text-white/60 text-sm'>
            This assessment invite link is invalid or has expired. Please check your email for the
            correct link, or contact the recruiter who invited you.
          </p>
        </div>
      </div>
    );
  }

  return (
    <InviteFlowProvider token={token} initialData={result.data}>
      {children}
    </InviteFlowProvider>
  );
};

export default AssessmentInviteLayout;
