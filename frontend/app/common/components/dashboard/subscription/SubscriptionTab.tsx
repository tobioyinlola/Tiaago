import { format } from "date-fns";

import {
  formatPrice,
  getFullUserType,
  getPeriodText,
} from "@/app/common/utils";
import {
  getSubscriptionInvoices,
  getAvailableSubscriptionPlans,
} from "@/app/common/services/subscription";
import { User } from "@/app/common/types";
import ScrollArea from "../../ScrollArea";
import StatusBadge from "../../StatusBadge";
import VisaLogoIcon from "@/app/common/icons/VisaLogoIcon";
import EmptyState from "@/app/common/components/dashboard/EmptyState";
import { getSubPlanBenefits } from "@/app/common/utils/subscriptionUtils";
import CurrentPlan from "@/app/common/components/dashboard/subscription/CurrentPlan";
import UpgradePlanModal from "@/app/common/components/dashboard/subscription/UpgradePlanModal";

const SubscriptionTab = async ({
  userType,
  email,
  subscribedPlan,
}: {
  userType: User["user_type"];
  email: string;
  subscribedPlan: User["subscribed_plan"];
}) => {
  const availablePlans = await getAvailableSubscriptionPlans();
  const subscriptionInvoices = await getSubscriptionInvoices();
  // const availablePlans = subscriptionPlans.filter(plan =>
  //   [userType, "BOTH"].includes(plan.user_type)
  // );
  const highestPlan = !availablePlans.length
    ? null
    : availablePlans.reduce((prev, current) =>
        parseFloat(prev.amount) > parseFloat(current.amount) ? prev : current
      );
  const isOnHighestPlan =
    subscribedPlan?.plan_id === highestPlan?.pk &&
    parseFloat(highestPlan?.amount ?? "0") > 0;
  const currentPlan = availablePlans.find(
    plan => plan.pk === subscribedPlan?.plan_id
  );
  const as = getFullUserType(userType);
  const benefits = getSubPlanBenefits(as, currentPlan);
  return (
    <div>
      <div className='w-full rounded-t-lg p-6 bg-[#D9DDFF]'>
        <h2 className='text-base font-semibold'>Plan & Pricing</h2>
      </div>
      <CurrentPlan showCheckIcon planName={subscribedPlan?.plan} />
      <div className='p-4 border-x border-[#EAECF0] border-b rounded-b-lg'>
        <div className='flex max-md:flex-col justify-between pb-4'>
          <div>
            <h3 className='text-sm text-gray-500'>
              <span className='text-3xl text-[#E7461E] font-semibold'>
                {formatPrice({
                  price: +(currentPlan?.amount ?? "0"),
                  currencyCode: currentPlan?.currency,
                })}
              </span>{" "}
              {getPeriodText(currentPlan?.no_of_days ?? 30)}
            </h3>
            <p className='text-gray-500 text-sm'>
              {benefits?.map(
                (benefit, i) =>
                  `${benefit} ${i !== benefits.length - 1 ? " - " : ""}`
              )}
            </p>
          </div>
          {!isOnHighestPlan && (
            <UpgradePlanModal
              subscriptionPlans={availablePlans}
              subscribedPlan={subscribedPlan}
              as={as}
              email={email}
            />
          )}
        </div>
        <div className='hidden md:flex justify-between py-6 px-2 items-center'>
          <div className='flex gap-3 items-center py-4 pr-6'>
            <VisaLogoIcon />
            <div>
              <h4 className='text-gray-900 text-sm font-medium'>
                Ending in 1234
              </h4>
              <p className='text-gray-500 text-sm'>Expiry 06/2024</p>
            </div>
          </div>
          <button className='btn btn-outline border-gray-300 text-gray-700'>
            Edit billing information
          </button>
        </div>
      </div>

      {/* Invoices */}
      <div className='w-full rounded-t-lg p-6 bg-[#D9DDFF] mt-8'>
        <h2 className='text-base font-semibold'>Invoices</h2>
      </div>
      <ScrollArea className='border-x border-[#EAECF0] border-b rounded-b-lg dashboard-content-constraint'>
        <table className='table table-zebra text-sm'>
          {/* head */}
          <thead>
            <tr>
              <th>Date</th>
              <th>Status</th>
              <th>Amount</th>
              <th>Plan</th>
            </tr>
          </thead>
          <tbody className='text-[#101828]'>
            {subscriptionInvoices.map(invoice => {
              const plan = availablePlans.find(
                plan => plan.pk === invoice.plan_id
              );
              return (
                <tr key={invoice.ref}>
                  <td>
                    {format(new Date(invoice.date_created), "MMM dd, yyyy")}
                  </td>
                  <td>
                    <StatusBadge status={invoice.status as any} />
                  </td>
                  <td>
                    {formatPrice({
                      price: +(plan?.amount ?? "0"),
                      currencyCode: plan?.currency,
                    })}
                  </td>
                  <td>{plan?.name}</td>
                </tr>
              );
            })}
            {!subscriptionInvoices.length && (
              <tr>
                <td colSpan={4}>
                  <EmptyState text='Your invoices will appear here...' />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </ScrollArea>
    </div>
  );
};

export default SubscriptionTab;
