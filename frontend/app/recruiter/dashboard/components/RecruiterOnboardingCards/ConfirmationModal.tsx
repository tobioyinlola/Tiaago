import { DollarSign } from "lucide-react";

interface ConfirmationModalProps {
  userName: string;
  onClose: () => void;
  onUsageBased: () => void;
}

export default function ConfirmationModal({
  userName,
  onClose,
  onUsageBased,
}: ConfirmationModalProps) {
  return (
    <div className="flex flex-col items-center text-center py-4 sm:py-8">
      {/* Animated checkmark */}
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center animate-scale-in">
          <svg
            className="w-10 h-10 text-success"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path
              d="M5 12L10 17L19 7"
              className="animate-draw"
              style={{
                strokeDasharray: 24,
                strokeDashoffset: 24,
              }}
            />
          </svg>
        </div>
      </div>

      {/* Headline */}
      <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2">
        You&apos;re All Set, {userName}!
      </h2>
      <p className="text-sm sm:text-base text-muted-foreground mb-8 max-w-sm">
        Pay only for what you use, no subscriptions needed. Let&apos;s get you started.
      </p>

      <div className="w-full max-w-sm">
        <button
          onClick={onUsageBased}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-all min-h-[44px] w-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <DollarSign size={18} />
          Go to Billing
        </button>
      </div>

      {/* Support note */}
      <p className="mt-6 text-xs text-muted-foreground">
        Need help?{" "}
        <a
          href="mailto:support@tiaago.com"
          className="text-primary hover:underline font-medium"
        >
          support@tiaago.com
        </a>
      </p>
    </div>
  );
}
