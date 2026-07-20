"use client";

import { useEffect, useState } from "react";
import { cn } from "@/app/common/utils";
import { PostHeading } from "./headings";

const TableOfContents = ({ headings }: { headings: PostHeading[] }) => {
  const [activeId, setActiveId] = useState<string>(headings[0]?.id || "");

  useEffect(() => {
    if (!headings.length) return;

    const observer = new IntersectionObserver(
      entries => {
        const visible = entries.filter(entry => entry.isIntersecting);
        if (visible.length) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-112px 0px -70% 0px" }
    );

    headings.forEach(heading => {
      const el = document.getElementById(heading.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [headings]);

  if (!headings.length) return null;

  return (
    <nav aria-label='Table of contents'>
      <span className='block text-[10px] font-jetbrains-mono uppercase tracking-widest text-gray-400 mb-3'>
        On this page
      </span>
      <ul className='flex flex-col gap-0.5 border-l border-gray-200'>
        {headings.map(heading => (
          <li key={heading.id}>
            <a
              href={`#${heading.id}`}
              className={cn(
                "block border-l-2 -ml-px py-1.5 text-sm transition-colors duration-150",
                heading.level === 3 ? "pl-7" : "pl-4",
                activeId === heading.id
                  ? "border-[#5465FF] text-[#5465FF] font-semibold"
                  : "border-transparent text-gray-500 hover:text-gray-900"
              )}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default TableOfContents;
