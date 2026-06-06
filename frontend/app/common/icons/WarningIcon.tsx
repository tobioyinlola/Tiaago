import type { IconBaseProps } from "react-icons";

const WarningIcon = (props: IconBaseProps) => {
  return (
    <svg
      width='96'
      height='97'
      viewBox='0 0 96 97'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      {...props}
    >
      <rect x='8' y='8.5' width='80' height='80' rx='40' fill='#FF7A00' />
      <rect
        x='4'
        y='4.5'
        width='88'
        height='88'
        rx='44'
        stroke='#FF7A00'
        strokeOpacity='0.2'
        strokeWidth='8'
      />
      <g clipPath='url(#clip0_1629_28434)'>
        <path
          d='M48 33.167L29.6666 64.8337H66.3333L48 33.167Z'
          stroke='white'
          strokeWidth='4'
          strokeLinejoin='round'
        />
        <path
          d='M48 58.1673V59.0007M48 44.834L48.0067 53.1673'
          stroke='white'
          strokeWidth='4'
          strokeLinecap='round'
        />
      </g>
      <defs>
        <clipPath id='clip0_1629_28434'>
          <rect
            width='40'
            height='40'
            fill='white'
            transform='translate(28 29)'
          />
        </clipPath>
      </defs>
    </svg>
  );
};

export default WarningIcon;
