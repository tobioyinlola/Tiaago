import { IconBaseProps } from "react-icons";

const InfoCircleIcon = ({ size = 12, ...props }: IconBaseProps) => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    width={size}
    height={size}
    viewBox='0 0 12 12'
    fill='none'
    {...props}
  >
    <path
      d='M11 6C11 3.23857 8.7614 1 6 1C3.23857 1 1 3.23857 1 6C1 8.7614 3.23857 11 6 11C8.7614 11 11 8.7614 11 6Z'
      stroke='currentColor'
    />
    <path
      d='M6.12109 8.5V6C6.12109 5.7643 6.12109 5.64645 6.04784 5.5732C5.97464 5.5 5.85679 5.5 5.62109 5.5'
      stroke='currentColor'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
    <path
      d='M5.99609 4H6.00059'
      stroke='currentColor'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
);

export default InfoCircleIcon;
