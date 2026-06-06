import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import Pricing from "./_components/Pricing";
import Footer from "@/app/common/components/Layout/Footer";
import { handleServerApiCallError } from "@/app/common/utils";
import { getCurrentUser } from "@/app/common/services/profile";
import { getSubscriptionPlansBasedOnCountry } from "@/app/common/services/subscription";
import { SubscriptionPlanV3 } from "@/app/common/types";

export const metadata = {
  title: "Pricing",
};

const PricingPage = async () => {
  const errors: DisplayErrorMessagesProps["errors"] = [];

  const currentUser = (await getCurrentUser(undefined, { allowNull: true }))
    ?.currentUser;
  const subscriptionPlansRes = await getSubscriptionPlansBasedOnCountry(
    currentUser?.country
  ).catch(async e => {
    const error = await handleServerApiCallError(e);
    console.log("Get subscription plans error (pricing page): ", error);
    errors.push({
      message: error,
      title: "Error getting subscription plans",
    });
    return null;
  });

  const subscriptionPlans = Array.isArray(subscriptionPlansRes)
    ? (subscriptionPlansRes as any as SubscriptionPlanV3[])
    : subscriptionPlansRes?.results || [];

  return (
    <>
      <DisplayErrorMessages errors={errors} />
      <Pricing
        currentUser={currentUser}
        subscriptionPlans={subscriptionPlans}
      />
      <Footer />
    </>
  );
};

export default PricingPage;
