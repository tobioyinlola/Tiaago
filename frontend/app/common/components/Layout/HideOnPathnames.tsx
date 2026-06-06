"use client";
import { usePathname } from "next/navigation";

const HideOnPathnames = ({
  pathnames = [],
  exact = true,
  children,
}: {
  pathnames: string[];
  children: React.ReactNode;
  exact?: boolean;
}) => {
  const pathname = usePathname();
  if (pathnames.includes(pathname)) {
    return null;
  } else if (!exact && pathnames.some(p => pathname.includes(p))) {
    return null;
  }
  return children;
};

export default HideOnPathnames;
