import { cn } from "../utils";

type CustomBadgeProps = {
  text?: string;
  className?: string;
  fill?: string;
  style?: React.CSSProperties;
  hideDot?: boolean;
};

const CustomBadge = ({
  text,
  className = "",
  fill = "#12B76A",
  style,
  hideDot,
}: CustomBadgeProps) => {
  return (
    <div
      className={cn(
        "badge bg-[#ECFDF3] gap-2 text-xs font-semibold text-[#027A48]",
        className
      )}
      style={style}
    >
      {!hideDot && (
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='8'
          height='8'
          viewBox='0 0 8 8'
          fill='none'
        >
          <circle cx='4' cy='4' r='3' fill={fill} />
        </svg>
      )}
      {text}
    </div>
  );
};

export default CustomBadge;
