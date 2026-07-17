import Link from "next/link";

import { cn } from "@/app/common/utils";

const TagsTabs = ({ active }: { active: "system" | "custom" }) => {
  const tabClass = (tab: string) =>
    cn(
      "px-4 py-2 text-sm font-medium border-b-2 -mb-px",
      active === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
    );

  return (
    <div className="flex gap-2 border-b border-border mb-6">
      <Link href="?tab=system" className={tabClass("system")}>
        System Tags
      </Link>
      <Link href="?tab=custom" className={tabClass("custom")}>
        Custom Tags
      </Link>
    </div>
  );
};

export default TagsTabs;
