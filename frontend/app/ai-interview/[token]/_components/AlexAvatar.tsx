import { cn } from "@/app/common/utils";

/** Minimal, professional illustrated avatar for Alex, the AI interviewer --
 * no external image asset, just an inline SVG so it always renders instantly
 * and matches the primary blue accent used throughout the AI interview flow. */
const AlexAvatar = ({ className, ringClassName }: { className?: string; ringClassName?: string }) => (
  <div className={cn("relative rounded-full", ringClassName)}>
    <svg viewBox='0 0 96 96' className={cn("rounded-full", className)} aria-hidden>
      <circle cx='48' cy='48' r='48' fill='#1E2560' />
      <circle cx='48' cy='48' r='48' fill='url(#alex-gradient)' fillOpacity='0.4' />
      <circle cx='48' cy='40' r='16' fill='#EEF0FF' />
      <path d='M20 84c2-16 12-26 28-26s26 10 28 26' fill='#EEF0FF' />
      <defs>
        <linearGradient id='alex-gradient' x1='0' y1='0' x2='96' y2='96' gradientUnits='userSpaceOnUse'>
          <stop stopColor='#5465FF' />
          <stop offset='1' stopColor='#1E2560' />
        </linearGradient>
      </defs>
    </svg>
  </div>
);

export default AlexAvatar;
