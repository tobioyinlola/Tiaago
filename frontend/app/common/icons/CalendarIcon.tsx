import { IconBaseProps } from "react-icons";
import { cn } from "../utils";

const CalendarIcon = ({ size = 16, ...props }: IconBaseProps) => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    width={size}
    height={size}
    fill='none'
    viewBox={`0 0 ${size} ${size}`}
    {...props}
    className={cn("stroke-[#344054]", props.className)}
  >
    <path
      stroke='currentColor'
      strokeLinecap='round'
      strokeLinejoin='round'
      d='M7.333 8.667h3.334m-5.334 0h.006m3.328 2.667H5.333m5.334 0h-.006M12 1.333v1.333M4 1.333v1.333M1.667 8.162c0-2.905 0-4.357.834-5.26C3.336 2 4.68 2 7.367 2h1.266c2.687 0 4.03 0 4.866.902.834.903.834 2.355.834 5.26v.343c0 2.904 0 4.357-.834 5.26-.835.902-2.179.902-4.866.902H7.367c-2.687 0-4.03 0-4.866-.903-.834-.902-.834-2.355-.834-5.26zM2 5.333h12'
    />
  </svg>
);

export default CalendarIcon;

export const CalendarIconV2 = ({ size = 22, ...props }: IconBaseProps) => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    width={size}
    height={size}
    fill='none'
    viewBox={`0 0 ${size} ${size}`}
    {...props}
  >
    <path
      d='M17 1V3M5 1V3'
      stroke='currentColor'
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
    <path
      d='M9 16L8.99999 12.3472C8.99999 12.1555 8.86325 12 8.69458 12H8M12.6297 16L13.9842 12.3492C14.0475 12.1785 13.9128 12 13.7207 12H12'
      stroke='currentColor'
      strokeWidth='1.5'
      strokeLinecap='round'
    />
    <path
      d='M1.5 11.2432C1.5 6.88594 1.5 4.70728 2.75212 3.35364C4.00424 2 6.01949 2 10.05 2H11.95C15.9805 2 17.9958 2 19.2479 3.35364C20.5 4.70728 20.5 6.88594 20.5 11.2432V11.7568C20.5 16.1141 20.5 18.2927 19.2479 19.6464C17.9958 21 15.9805 21 11.95 21H10.05C6.01949 21 4.00424 21 2.75212 19.6464C1.5 18.2927 1.5 16.1141 1.5 11.7568V11.2432Z'
      stroke='currentColor'
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
    <path
      d='M5 7H17'
      stroke='currentColor'
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
);
