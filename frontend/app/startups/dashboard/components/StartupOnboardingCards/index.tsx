"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import WelcomeCard from "./WelcomeCard";
import PostJobCard from "./PostJobCard";
import FindTalentsCard from "./FindTalentsCard";
import AIFeedbackCard from "./AIFeedbackCard";
import PaymentCard from "./PaymentCard";
import ConfirmationModal from "./ConfirmationModal";
import { useStartupStore } from "../../store";
import { useMultiStep } from "@/app/common/store/useMultiStep";
import Modal from "@/app/common/components/Modal";
import SubscriptionPlansModal from "./SubscriptionPlansModal";

const TOTAL_STEPS = 5;
const scrollAreaId = "startup-onboarding-scroll-area";

function StartupOnboardingCards({ isTeamMember = false }: { isTeamMember?: boolean }) {
  const [
    profile,
    hasBeenOnboarded,
    onboardingStep,
    setOnboardingStep,
    setHasBeenOnboarded,
  ] = useStartupStore(s => [
    s.profile,
    s.hasBeenOnboarded,
    s.onboardingStep,
    s.setOnboardingStep,
    s.setHasBeenOnboarded,
  ]);
  const { step: currentStep, nextStep, prevStep, setStep } = useMultiStep();
  const confirmationModalRef = useRef<HTMLDialogElement>(null);
  const onboardingModalRef = useRef<HTMLDialogElement>(null);
  const subscriptionModalRef = useRef<HTMLDialogElement>(null);
  const userName = profile?.first_name || "there";
  const router = useRouter();

  const handleCloseModal = () => {
    confirmationModalRef.current?.close();
  };

  const handleOpenModal = () => {
    setOnboardingStep(TOTAL_STEPS);
    setHasBeenOnboarded(true);
    if (isTeamMember) {
      onboardingModalRef.current?.close();
      return;
    }
    confirmationModalRef.current?.showModal();
  };

  const scrollToTop = () => {
    const element =
      document.getElementById(scrollAreaId) ?? document.documentElement;
    element.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS) {
      nextStep(TOTAL_STEPS);
      setOnboardingStep(currentStep + 1);
      scrollToTop();
    } else {
      handleOpenModal();
    }
  };

  const handlePrevious = () => {
    prevStep(1);
    scrollToTop();
  };

  const handleSkip = () => handleOpenModal();

  const handleUsageBased = () => {
    handleCloseModal();
    setStep(0);
    onboardingModalRef.current?.close();
    router.push("/startups/dashboard/billing");
  };

  const handleSubscription = () => {
    confirmationModalRef.current?.close();
    subscriptionModalRef.current?.showModal();
  };

  const handleCloseSubscriptionModal = () => {
    subscriptionModalRef.current?.close();
    handleCloseModal();
    onboardingModalRef.current?.close();
  };

  const handleSelectPlan = (planName: string) => {
    handleCloseSubscriptionModal();
    router.push("/startups/dashboard/billing");
  };

  const renderCurrentCard = () => {
    switch (currentStep) {
      case 1:
        return (
          <WelcomeCard
            userName={userName}
            currentStep={currentStep}
            totalSteps={TOTAL_STEPS}
            onNext={handleNext}
            onSkip={handleSkip}
          />
        );
      case 2:
        return (
          <PostJobCard
            currentStep={currentStep}
            totalSteps={TOTAL_STEPS}
            onNext={handleNext}
            onPrevious={handlePrevious}
            onSkip={handleSkip}
          />
        );
      case 3:
        return (
          <FindTalentsCard
            currentStep={currentStep}
            totalSteps={TOTAL_STEPS}
            onNext={handleNext}
            onPrevious={handlePrevious}
            onSkip={handleSkip}
          />
        );
      case 4:
        return (
          <AIFeedbackCard
            currentStep={currentStep}
            totalSteps={TOTAL_STEPS}
            onNext={handleNext}
            onPrevious={handlePrevious}
            onSkip={handleSkip}
          />
        );
      case 5:
        return (
          <PaymentCard
            currentStep={currentStep}
            totalSteps={TOTAL_STEPS}
            onNext={handleNext}
            onPrevious={handlePrevious}
            onSkip={handleSkip}
          />
        );
      default:
        return null;
    }
  };

  useEffect(() => {
    if (!hasBeenOnboarded) {
      onboardingModalRef.current?.showModal();
      setStep(onboardingStep);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasBeenOnboarded]);

  return (
    <>
      <Modal
        id='onboarding-modal'
        modalRef={onboardingModalRef}
        disableBackdropClick
        disableClose
        className='md:max-w-2xl w-[90svw]'
        scrollAreaClassName='max-w-2xl'
        scrollAreaId={scrollAreaId}
      >
        {renderCurrentCard()}
      </Modal>
      {/* Confirmation Modal */}
      <Modal
        id='confirmation-modal'
        modalRef={confirmationModalRef}
        disableBackdropClick
        disableClose
      >
        <ConfirmationModal
          userName={userName}
          onClose={handleCloseModal}
          onSubscription={handleSubscription}
          onUsageBased={handleUsageBased}
        />
      </Modal>
      {/* Subscription Plans Modal */}
      <Modal
        id='subscription-modal'
        modalRef={subscriptionModalRef}
        disableBackdropClick
        disableClose
        className='md:max-w-4xl w-[90svw]'
        scrollAreaClassName="max-w-4xl"
      >
        <SubscriptionPlansModal
          onClose={handleCloseSubscriptionModal}
          onSelectPlan={handleSelectPlan}
        />
      </Modal>
    </>
  );
}

export default StartupOnboardingCards;
