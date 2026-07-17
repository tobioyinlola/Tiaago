import { cn } from "@/app/common/utils";

export type StatCardProps = {
  label: string;
  value: string | number | null | undefined;
  alert?: boolean;
  subText?: string;
  unavailableText?: string;
};

const StatCard = ({
  label,
  value,
  alert = false,
  subText,
  unavailableText = "Not connected",
}: StatCardProps) => {
  const isUnavailable = value === null || value === undefined;
  return (
    <div className='rounded-lg border bg-card text-card-foreground p-6 shadow-sm'>
      <p className='text-sm text-muted-foreground'>{label}</p>
      <p
        className={cn(
          "mt-2 font-space-grotesk text-3xl font-semibold",
          alert && !isUnavailable && "text-destructive",
          isUnavailable && "text-muted-foreground/50 text-2xl"
        )}
      >
        {isUnavailable ? "—" : value}
      </p>
      {(subText || isUnavailable) && (
        <p className='mt-1 text-xs text-muted-foreground'>
          {isUnavailable ? unavailableText : subText}
        </p>
      )}
    </div>
  );
};

export default StatCard;
