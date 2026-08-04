import { LinkIcon, type LucideIcon } from "lucide-react";

import BrandLink from "@/app/common/components/BrandLink";
import { cn } from "@/app/common/utils";

type NoticeTone = "error" | "neutral" | "success";

const TONES: Record<NoticeTone, { wrap: string; icon: string }> = {
  error: { wrap: "bg-error/10", icon: "text-error" },
  neutral: { wrap: "bg-primary/10", icon: "text-primary" },
  success: { wrap: "bg-primary/10", icon: "text-primary" },
};

/**
 * Full-page branded message for every terminal state of the AI interview
 * flow (bad link, expired window, already completed). No nav, no links back
 * into the product -- the candidate has no account and no context.
 */
const AIInterviewNotice = ({
  title,
  description,
  tone = "neutral",
  Icon = LinkIcon,
}: {
  title: string;
  description?: string;
  tone?: NoticeTone;
  Icon?: LucideIcon;
}) => {
  const { wrap, icon } = TONES[tone];

  return (
    <div className='min-h-[100svh] w-full bg-white flex flex-col'>
      <header className='w-full px-6 md:px-10 py-5'>
        <BrandLink containerClassName='shrink-0' />
      </header>

      <div className='flex-1 flex items-center justify-center px-6 pb-20'>
        <div className='max-w-md w-full text-center'>
          <div className={cn("mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-6", wrap)}>
            <Icon className={cn("h-8 w-8", icon)} />
          </div>
          <h1 className='text-2xl md:text-[28px] font-bold text-primary-black font-space-grotesk mb-3'>
            {title}
          </h1>
          {description && <p className='text-secondary-black leading-7'>{description}</p>}
        </div>
      </div>
    </div>
  );
};

export default AIInterviewNotice;
