import { PiEye, PiUserPlus } from "react-icons/pi";

export const jobApplicationMenuItems = [
  {
    label: "View detailed report" as const,
    Icon: PiEye,
  },
  // {
  //   label: "View profile" as const,
  //   Icon: PiEye,
  // },
  // {
  //   label: "Reject Candidate" as const,
  //   Icon: (props: IconBaseProps) => (
  //     <svg
  //       xmlns='http://www.w3.org/2000/svg'
  //       width='14'
  //       height='12'
  //       viewBox='0 0 14 12'
  //       fill='none'
  //       {...props}
  //     >
  //       <path
  //         d='M3.02166 7.92322C2.28808 8.3532 0.364667 9.23118 1.53615 10.3298C2.10842 10.8665 2.74577 11.2503 3.54708 11.2503H8.11951C8.92082 11.2503 9.55817 10.8665 10.1304 10.3298C11.3019 9.23118 9.3785 8.3532 8.64492 7.92322C6.92468 6.91492 4.74191 6.91492 3.02166 7.92322Z'
  //         stroke='#616161'
  //         strokeLinecap='round'
  //         strokeLinejoin='round'
  //       />
  //       <path
  //         d='M8.16667 3.08333C8.16667 4.372 7.122 5.41667 5.83333 5.41667C4.54467 5.41667 3.5 4.372 3.5 3.08333C3.5 1.79467 4.54467 0.75 5.83333 0.75C7.122 0.75 8.16667 1.79467 8.16667 3.08333Z'
  //         stroke='#616161'
  //       />
  //       <path
  //         d='M12.8333 1.625L11.375 3.08333M11.375 3.08333L9.91663 4.54167M11.375 3.08333L12.8333 4.54167M11.375 3.08333L9.91663 1.625'
  //         stroke='#616161'
  //         strokeLinecap='round'
  //         strokeLinejoin='round'
  //       />
  //     </svg>
  //   ),
  // },
  {
    label: "Add to Pipeline" as const,
    Icon: PiUserPlus,
  },
];
