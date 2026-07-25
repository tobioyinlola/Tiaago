import { getCountries } from "@/app/common/services";
import AuthFormPageWrapper from "@/app/common/components/Forms/AuthFormPageWrapper";
import TalentNetworkJoinForm from "./_components/TalentNetworkJoinForm";

export const metadata = {
  title: "Join the TIAAGO Talent Network",
};

const TalentNetworkPage = async () => {
  const groupedCountries = await getCountries();

  return (
    <AuthFormPageWrapper
      title="Join the TIAAGO Talent Network"
      as="talent"
      hideAltLink
      containerClassName="md:max-w-[560px]"
    >
      <p className="text-[#5F6264] text-sm font-onest mt-2 mb-8 max-w-md">
        Receive curated job opportunities that match your career interests --
        no spam, no subscription fee, only relevant opportunities.
      </p>
      <TalentNetworkJoinForm groupedCountries={groupedCountries} />
    </AuthFormPageWrapper>
  );
};

export default TalentNetworkPage;
