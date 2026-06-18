import OnboardingCard from "./OnboardingCard";

interface WelcomeCardProps {
  userName: string;
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onSkip: () => void;
}

export default function WelcomeCard({
  userName,
  currentStep,
  totalSteps,
  onNext,
  onSkip,
}: WelcomeCardProps) {
  return (
    <OnboardingCard
      currentStep={currentStep}
      totalSteps={totalSteps}
      onNext={onNext}
      onSkip={onSkip}
    >
      <div className="w-full space-y-4 sm:space-y-6">
        {/* Headline */}
        <div className="text-center space-y-2">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">
            Welcome, {userName}!
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            See how startups hire top African talent in minutes.
          </p>
        </div>

        {/* YouTube Video */}
        <div className="w-full rounded-xl overflow-hidden shadow-card">
          <div className="aspect-video">
            <iframe
              width="100%"
              height="100%"
              src="https://www.youtube.com/embed/_QLWQnn2hSs?si=Z8KWTfv-NEKb5JM_"
              title="TIAAGO overview"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
              className="rounded-xl"
            />
          </div>
        </div>
      </div>
    </OnboardingCard>
  );
}
