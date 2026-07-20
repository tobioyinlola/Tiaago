import Pricing from "./_components/Pricing";
import Footer from "@/app/common/components/Layout/Footer";

export const metadata = {
  title: "Pricing",
};

const PricingPage = () => {
  return (
    <>
      <Pricing />
      <Footer />
    </>
  );
};

export default PricingPage;
