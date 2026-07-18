"use client";

import { useState } from "react";
import { Link2, Check } from "lucide-react";

const XIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M18.9 2.4h3.3l-7.3 8.3 8.5 11.2h-6.6l-5.2-6.8-5.9 6.8H2.3l7.8-8.9L2 2.4h6.8l4.7 6.2zm-1.2 17.5h1.8L7.4 4.3H5.5z" />
  </svg>
);

const LinkedInIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56z" />
  </svg>
);

const ShareBar = ({
  url,
  title,
  vertical = false,
}: {
  url: string;
  title: string;
  vertical?: boolean;
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable -- fail silently, nothing else to do.
    }
  };

  const iconClass =
    "h-9 w-9 flex items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:border-[#5465FF] hover:text-[#5465FF] hover:bg-[#5465FF]/5 transition-colors duration-200";

  return (
    <div className={vertical ? "flex flex-col items-center gap-3" : "flex items-center gap-3"}>
      {vertical && <span className="text-[10px] font-jetbrains-mono uppercase tracking-widest text-gray-400">Share</span>}
      <a
        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        className={iconClass}
        aria-label="Share on X"
      >
        <XIcon className="h-4 w-4" />
      </a>
      <a
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        className={iconClass}
        aria-label="Share on LinkedIn"
      >
        <LinkedInIcon className="h-4 w-4" />
      </a>
      <button
        type="button"
        onClick={handleCopy}
        className={iconClass}
        aria-label="Copy link"
      >
        {copied ? <Check className="h-4 w-4 text-[#00B849]" /> : <Link2 className="h-4 w-4" />}
      </button>
    </div>
  );
};

export default ShareBar;
