"use client";
import Button from "@/app/common/components/DaisyButton";
import { useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { FiArrowUpRight, FiZap } from "react-icons/fi";

import {
  cn,
  formatPrice,
  getPeriodText,
  handleFormSubmissionError,
} from "@/app/common/utils";
import EmptyState from "../EmptyState";
import CurrentPlan from "./CurrentPlan";
import Modal from "@/app/common/components/Modal";
import { useAlert } from "@/app/common/store/useAlert";
import Selected from "@/app/common/components/Selected";
import CustomBadge from "@/app/common/components/CustomBadge";
import clientKyInstance from "@/app/common/utils/client-ky.instance";
import { getSubPlanBenefits } from "@/app/common/utils/subscriptionUtils";
import { BasePageProps, SubscriptionPlan, User } from "@/app/common/types";
import { trackSubscriptionRequest } from "@/app/common/services/mixpanel.services";

const UpgradePlanModal = ({
  subscriptionPlans,
  isNav,
  subscribedPlan,
  as,
  email,
}: {
  subscriptionPlans: SubscriptionPlan[];
  isNav?: boolean;
  subscribedPlan: User["subscribed_plan"];
  as: BasePageProps["as"];
  email: string;
}) => {
  const modalRef = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();
  const isOnSkillAssessmentPage = pathname.includes("/skill-assessment");

  const setAlert = useAlert(state => state.setAlert);
  const [isLoading, setIsLoading] = useState(false);
  const [hasBeenWarned, setHasBeenWarned] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<number>();
  const subPlans = subscriptionPlans
    .filter(plan => plan.pk !== subscribedPlan?.plan_id)
    .sort(
      (a, b) => (a.sub_type === "BS" ? -1 : 1) - (b.sub_type === "BS" ? -1 : 1)
    );

  const handleUpgradePlan = async () => {
    const plan = subscriptionPlans.find(plan => plan.pk === selectedPlan);
    if (!plan)
      return setAlert({ title: "Invalid plan selected", icon: "error" });
    if (plan.sub_type !== "PR" && isOnSkillAssessmentPage && !hasBeenWarned) {
      setAlert({
        title: "Are you sure you want to proceed?",
        icon: "warning",
        message:
          "You are about to upgrade to a Basic plan. This will disable your access to the skill assessment feature.",
        buttonAction: () => {
          setHasBeenWarned(true);
        },
      });
      return;
    }
    if (isLoading) return;
    setIsLoading(true);
    try {
      const data = await clientKyInstance
        .post("payments/initialize/", {
          json: {
            plan_id: selectedPlan,
          },
        })
        .json<{ payment_url: string }>();
      console.log(data);
      setIsLoading(false);
      if (data.payment_url) {
        try {
          await trackSubscriptionRequest({
            ...plan,
            user_id: email,
          });
        } catch (error) {
          if (process.env.NODE_ENV === "development") console.error(error);
        }
        window.location.href = data.payment_url;
      } else
        setAlert({
          title: "An error occurred",
          icon: "error",
          message: "Unhandled payload from server",
        });
    } catch (error: any) {
      handleFormSubmissionError(error, undefined, setAlert);
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        className={
          isNav
            ? "btn btn-outline border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-700"
            : "btn btn-link btn-primary no-underline font-medium w-fit max-md:pl-0"
        }
        onClick={() => modalRef.current?.showModal()}
      >
        {isNav ? (
          <>
            <FiZap className='text-xl' />
            upgrade now
          </>
        ) : (
          <>
            upgrade plan
            <FiArrowUpRight className='text-xl' />
          </>
        )}
      </button>
      <Modal
        id={`${isNav ? "nav-" : ""}upgrade-plan-modal`}
        modalRef={modalRef}
        disableClose={isLoading}
        autoHeight={!subPlans.length}
      >
        <div className='w-[80svw] max-w-md'>
          <h3 className='text-[26px] leading-[38px] -tracking-[0.5px] font-semibold'>
            Upgrade Subscription Plan
          </h3>
          <p className='text-[#999] text-sm -tracking-[0.1px]'>
            Kindly Select a Plan
          </p>
          <div className='flex flex-col gap-8 my-5 w-full'>
            <CurrentPlan
              planName={
                "Current Plan - " + (subscribedPlan?.plan ?? "Free Plan")
              }
            />
            {subPlans.map(plan => (
              <div
                key={plan.name + plan.pk}
                onClick={() => setSelectedPlan(plan.pk)}
                className={cn(
                  "card card-bordered max-sm:card-compact cursor-pointer hover:border-primary shadow-sm",
                  selectedPlan === plan.pk && "border-primary"
                )}
              >
                <div className='card-body'>
                  <div className='flex items-center justify-between gap-1'>
                    <div className='flex md:items-center max-md:flex-col gap-2'>
                      <h4 className='card-title text-gray-900 capitalize'>
                        {plan.name}
                      </h4>
                      <CustomBadge
                        text={`${formatPrice({
                          price: +(plan.amount ?? "0"),
                          currencyCode: plan.currency,
                          noOfDigits: 0,
                        })}${getPeriodText(plan.no_of_days)}`}
                        hideDot
                        className='h-fit py-[2px]'
                      />
                    </div>
                    <Selected
                      isSelected={selectedPlan === plan.pk}
                      className='static'
                    />
                  </div>
                  <p className='text-gray-500 text-base'>{plan.details}</p>
                  <ul className='list-disc flex flex-col gap-3 mt-6 pl-4'>
                    {getSubPlanBenefits(as, plan).map(benefit => (
                      <li
                        key={benefit}
                        className='list-item text-sm font-medium text-[#23262F]'
                      >
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
            {!subPlans.length && (
              <EmptyState text='There are no plans available for you to upgrade to at the moment.' />
            )}
          </div>
          {!!subPlans.length && (
            <Button
              className='btn btn-primary w-full'
              onClick={handleUpgradePlan}
              loading={isLoading}
              disabled={!selectedPlan}
            >
              Continue
            </Button>
          )}
        </div>
      </Modal>
    </>
  );
};

export default UpgradePlanModal;
