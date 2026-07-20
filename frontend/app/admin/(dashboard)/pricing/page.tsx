import { redirect } from "next/navigation";

import { getCurrentUser } from "@/app/common/services/profile";
import { getPricingConfig } from "@/app/common/services/pricing";
import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import { handleServerApiCallError } from "@/app/common/utils";
import PricingSection from "./_components/PricingSection";

export const metadata = {
  title: "Pricing",
};

const PRICE_FIELDS = {
  usd: [
    { key: "resume_screening_usd", label: "Resume screening price", suffix: "per candidate" },
    { key: "assessment_usd", label: "Assessment price", suffix: "per candidate" },
    { key: "minimum_topup_usd", label: "Minimum top-up amount", suffix: "" },
  ],
  ngn: [
    { key: "resume_screening_ngn", label: "Resume screening price", suffix: "per candidate" },
    { key: "assessment_ngn", label: "Assessment price", suffix: "per candidate" },
    { key: "minimum_topup_ngn", label: "Minimum top-up amount", suffix: "" },
  ],
};

const PricingPage = async () => {
  const { currentUser } = await getCurrentUser("staff");
  const canView = currentUser.is_super_admin || currentUser.permissions.includes("revenue.view");
  if (!canView) {
    redirect("/admin/unauthorised?permission=revenue.view");
  }
  const canManage = currentUser.is_super_admin || currentUser.permissions.includes("revenue.manage");

  const errors: DisplayErrorMessagesProps["errors"] = [];
  const pricing = await getPricingConfig().catch(async e => {
    const error = await handleServerApiCallError(e);
    errors.push({ message: error, title: "Error loading pricing" });
    return [];
  });

  const byKey = Object.fromEntries(pricing.map(row => [row.key, row]));

  return (
    <div className="p-4 sm:p-6 max-w-3xl">
      <DisplayErrorMessages errors={errors} />

      <h1 className="text-2xl font-bold text-gray-900 mb-2">Pricing</h1>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8 text-sm text-amber-800">
        Changing prices affects all new transactions immediately. Existing wallet balances and
        pending transactions are not affected.
      </div>

      <PricingSection
        title="USD Pricing"
        currencySymbol="$"
        fields={PRICE_FIELDS.usd.map(f => ({ ...f, row: byKey[f.key] }))}
        canManage={canManage}
      />

      <PricingSection
        title="NGN Pricing"
        currencySymbol="₦"
        fields={PRICE_FIELDS.ngn.map(f => ({ ...f, row: byKey[f.key] }))}
        canManage={canManage}
      />
    </div>
  );
};

export default PricingPage;
