import { IconBaseProps } from "react-icons";

const RetryIcon = (props: IconBaseProps) => {
  return (
    <svg
      width='96'
      height='96'
      viewBox='0 0 96 96'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      {...props}
    >
      <rect x='8' y='8' width='80' height='80' rx='40' fill='#FF7A00' />
      <rect
        x='4'
        y='4'
        width='88'
        height='88'
        rx='44'
        stroke='#FF7A00'
        strokeOpacity='0.2'
        strokeWidth='8'
      />
      <path
        d='M33.8621 37.6864C36.3169 34.3213 39.8916 31.9422 43.9435 30.9766C47.9954 30.0111 52.2588 30.5225 55.9675 32.4189C59.6761 34.3154 62.5866 37.4724 64.176 41.3226C65.7653 45.1729 65.9292 49.4637 64.6382 53.424C63.3472 57.3842 60.6859 60.7541 57.1328 62.9279C53.5796 65.1017 49.3676 65.9368 45.2539 65.2832C41.1401 64.6296 37.3944 62.53 34.69 59.362C31.9856 56.1939 30.4999 52.1651 30.5 47.9997'
        stroke='white'
        strokeWidth='3'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
      <path
        d='M33 30.5V38H40.5'
        stroke='white'
        strokeWidth='3'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
      <path
        d='M48 40.5V48L51.75 51.75'
        stroke='white'
        strokeWidth='3'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  );
};

export default RetryIcon;
