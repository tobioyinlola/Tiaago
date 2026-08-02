import { getCountries } from "@/app/common/services";
import AuthFormPageWrapper from "@/app/common/components/Forms/AuthFormPageWrapper";
import TalentNetworkJoinForm from "./_components/TalentNetworkJoinForm";
import TalentNetworkVisitBeacon from "./_components/TalentNetworkVisitBeacon";

export const metadata = {
  title: "Join the TIAAGO Talent Network",
};

const TalentNetworkPage = async () => {
  const groupedCountries = await getCountries();

  return (
    <>
      <TalentNetworkVisitBeacon />
      <AuthFormPageWrapper
        title="Your Next Opportunity Should Find You."
        as="talent"
        hideAltLink
        hideSupport
        formScrollOnly
        containerClassName="md:max-w-[560px]"
        heroHeadline="Your Next Opportunity Should Find You."
        heroDescription="Join thousands of professionals in the TIAAGO Talent Network and get matched with opportunities from startups and growing companies actively hiring."
        testimonialQuote="Within two weeks of joining the Talent Network, I received three interview invitations from companies I wouldn't have discovered on my own."
        testimonialName="Sarah A."
        testimonialTitle="Product Manager"
      >
        <p className="text-[#5F6264] text-sm font-onest mt-2 mb-8 max-w-md">
          Join thousands of professionals in the TIAAGO Talent Network and get
          matched with opportunities from startups and growing companies
          actively hiring.
        </p>
        <TalentNetworkJoinForm groupedCountries={groupedCountries} />
      </AuthFormPageWrapper>
    </>
  );
};

export default TalentNetworkPage;
