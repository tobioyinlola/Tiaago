import Pricing from "./_components/Pricing";
import Footer from "@/app/common/components/Layout/Footer";
import { getPublicPricingConfig } from "@/app/common/services/pricing";
import { getDefaultCurrency } from "@/app/common/utils/geo";
import { buildPricingTiers, FREE_TIER_LIMIT } from "./constants";

export const metadata = {
  title: "Pricing",
};

const PricingPage = async () => {
  const [pricing, defaultCurrency] = await Promise.all([getPublicPricingConfig(), getDefaultCurrency()]);
  const pricingTiers = buildPricingTiers(pricing);
  const freeTierLimit = Number(pricing.free_tier_limit) || FREE_TIER_LIMIT;

  return (
    <>
      <Pricing pricingTiers={pricingTiers} freeTierLimit={freeTierLimit} defaultCurrency={defaultCurrency} />
      <Footer />
    </>
  );
};

export default PricingPage;
