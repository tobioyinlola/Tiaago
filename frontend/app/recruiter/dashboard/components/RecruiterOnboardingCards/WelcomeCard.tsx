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
          <p className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-primary">
            From the desk of our co-founder
          </p>
          <p className="text-sm sm:text-base text-muted-foreground">
            Take a minute to watch this before you dive in.
          </p>
        </div>

        {/* YouTube Video */}
        <div className="w-full rounded-xl overflow-hidden shadow-card">
          <div className="aspect-video">
            <iframe
              width="100%"
              height="100%"
              src="https://www.youtube.com/embed/WcUA0cD1ZDY"
              title="A message from our co-founder"
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
