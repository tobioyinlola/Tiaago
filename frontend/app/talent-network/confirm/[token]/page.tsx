import { getTalentNetworkConfirmation } from "@/app/common/services/talent-network";
import ConfirmMembershipButton from "./ConfirmMembershipButton";

export const metadata = {
  title: "Confirm your Talent Network membership",
};

type Props = {
  params: Promise<{ token: string }>;
};

const ConfirmTalentNetworkPage = async ({ params }: Props) => {
  const { token } = await params;
  const lookup = await getTalentNetworkConfirmation(token);

  return (
    <div className="min-h-screen bg-[#F7F8FC] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white border border-[#EAECF0] rounded-2lg shadow-card p-8 text-center">
        {!lookup.success ? (
          <>
            <h1 className="text-xl font-bold font-space-grotesk text-primaryBlack mb-2">
              This confirmation link isn&apos;t valid
            </h1>
            <p className="text-sm text-secondary-black">
              It may have already been used, or the link may be incomplete. Try joining again from the Talent Network
              page.
            </p>
          </>
        ) : lookup.data.status === "ACTIVE" ? (
          <>
            <h1 className="text-xl font-bold font-space-grotesk text-primaryBlack mb-2">
              You&apos;re officially part of the TIAAGO Talent Network.
            </h1>
            <p className="text-sm text-secondary-black">
              We&apos;ll notify you whenever a relevant opportunity becomes available.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold font-space-grotesk text-primaryBlack mb-2">
              Hi {lookup.data.first_name}, confirm your email
            </h1>
            <p className="text-sm text-secondary-black mb-6">
              One click to start receiving curated job opportunities at {lookup.data.email}.
            </p>
            <ConfirmMembershipButton token={token} />
          </>
        )}
      </div>
    </div>
  );
};

export default ConfirmTalentNetworkPage;
