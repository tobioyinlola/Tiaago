import { getCountries } from "@/app/common/services";
import TalentNetworkJoinForm from "./_components/TalentNetworkJoinForm";

export const metadata = {
  title: "Join the TIAAGO Talent Network",
};

const TalentNetworkPage = async () => {
  const groupedCountries = await getCountries();

  return (
    <div className="min-h-screen bg-[#F7F8FC]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-16 pb-8 text-center">
        <span className="inline-block text-xs font-semibold uppercase tracking-wide px-3 py-1 rounded-full bg-badge-blue-bg text-badge-blue-text mb-4">
          TIAAGO Talent Network
        </span>
        <h1 className="text-3xl sm:text-4xl font-bold font-space-grotesk text-primaryBlack mb-4">
          Join the TIAAGO Talent Network
        </h1>
        <p className="text-base text-secondary-black max-w-xl mx-auto mb-2">
          Receive curated job opportunities that match your career interests.
        </p>
        <p className="text-sm text-secondary-black max-w-xl mx-auto">
          No spam. No subscription fee. Only relevant opportunities.
        </p>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 pb-20">
        <TalentNetworkJoinForm groupedCountries={groupedCountries} />
      </div>
    </div>
  );
};

export default TalentNetworkPage;
