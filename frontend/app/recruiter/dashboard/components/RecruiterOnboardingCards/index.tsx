"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import WelcomeCard from "./WelcomeCard";
import PostJobCard from "./PostJobCard";
import { useRecruiterStore } from "../../store";
import { useMultiStep } from "@/app/common/store/useMultiStep";
import Modal from "@/app/common/components/Modal";

const TOTAL_STEPS = 2;
const scrollAreaId = "recruiter-onboarding-scroll-area";

function RecruiterOnboardingCards({ isTeamMember = false }: { isTeamMember?: boolean }) {
  const [
    profile,
    hasBeenOnboarded,
    onboardingStep,
    setOnboardingStep,
    setHasBeenOnboarded,
  ] = useRecruiterStore(s => [
    s.profile,
    s.hasBeenOnboarded,
    s.onboardingStep,
    s.setOnboardingStep,
    s.setHasBeenOnboarded,
  ]);
  const { step: currentStep, nextStep, prevStep, setStep } = useMultiStep();
  const onboardingModalRef = useRef<HTMLDialogElement>(null);
  const userName = profile?.first_name || "there";
  const router = useRouter();

  const scrollToTop = () => {
    const element =
      document.getElementById(scrollAreaId) ?? document.documentElement;
    element.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const finishOnboarding = () => {
    setOnboardingStep(TOTAL_STEPS);
    setHasBeenOnboarded(true);
    onboardingModalRef.current?.close();
  };

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS) {
      nextStep(TOTAL_STEPS);
      setOnboardingStep(currentStep + 1);
      scrollToTop();
    } else {
      finishOnboarding();
      // Team members aren't necessarily the ones who'll post the role --
      // just close the tour for them instead of redirecting.
      if (!isTeamMember) {
        router.push("/recruiter/dashboard/jobs/create");
      }
    }
  };

  const handlePrevious = () => {
    prevStep(1);
    scrollToTop();
  };

  const handleSkip = () => finishOnboarding();

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
      default:
        return null;
    }
  };

  useEffect(() => {
    if (!hasBeenOnboarded) {
      onboardingModalRef.current?.showModal();
      // Clamp against a stale onboardingStep persisted from before the
      // tour was shortened to TOTAL_STEPS -- otherwise a returning user
      // mid-way through the old (longer) tour would land past the last
      // known step and see a blank, un-closeable modal.
      setStep(Math.min(onboardingStep, TOTAL_STEPS) || 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasBeenOnboarded]);

  return (
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
  );
}

export default RecruiterOnboardingCards;
