import type { IconBaseProps } from "react-icons";
import { PiDownload, PiEye, PiFile, PiUserPlus } from "react-icons/pi";

import CalendarIcon from "@/app/common/icons/CalendarIcon";

export const jobApplicationMenuItems = [
  {
    label: "View detailed report" as const,
    Icon: PiEye,
  },
  // {
  //   label: "View profile" as const,
  //   Icon: PiEye,
  // },
  {
    label: "Schedule Interview" as const,
    Icon: CalendarIcon,
  },
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
    label: "Download Resume" as const,
    Icon: (props: IconBaseProps) => (
      <svg
        xmlns='http://www.w3.org/2000/svg'
        width='24'
        height='24'
        viewBox='0 0 24 24'
        {...props}
      >
        <path d='M15 22.75H9C3.57 22.75 1.25 20.43 1.25 15V9C1.25 3.57 3.57 1.25 9 1.25H15C20.43 1.25 22.75 3.57 22.75 9V15C22.75 20.43 20.43 22.75 15 22.75ZM9 2.75C4.39 2.75 2.75 4.39 2.75 9V15C2.75 19.61 4.39 21.25 9 21.25H15C19.61 21.25 21.25 19.61 21.25 15V9C21.25 4.39 19.61 2.75 15 2.75H9Z' />
        <path d='M11.9995 15.26C11.8095 15.26 11.6195 15.1899 11.4695 15.0399L8.46945 12.0399C8.17945 11.7499 8.17945 11.27 8.46945 10.98C8.75945 10.69 9.23945 10.69 9.52945 10.98L11.9995 13.45L14.4695 10.98C14.7595 10.69 15.2395 10.69 15.5295 10.98C15.8195 11.27 15.8195 11.7499 15.5295 12.0399L12.5295 15.0399C12.3795 15.1899 12.1895 15.26 11.9995 15.26Z' />
        <path d='M12 15.26C11.59 15.26 11.25 14.92 11.25 14.51V6.51001C11.25 6.10001 11.59 5.76001 12 5.76001C12.41 5.76001 12.75 6.10001 12.75 6.51001V14.51C12.75 14.93 12.41 15.26 12 15.26Z' />
        <path d='M12.0004 18.23C9.89043 18.23 7.77043 17.89 5.76043 17.22C5.37043 17.09 5.16043 16.66 5.29043 16.27C5.42043 15.88 5.84043 15.66 6.24043 15.8C9.96043 17.04 14.0504 17.04 17.7704 15.8C18.1604 15.67 18.5904 15.88 18.7204 16.27C18.8504 16.66 18.6404 17.09 18.2504 17.22C16.2304 17.9 14.1104 18.23 12.0004 18.23Z' />
      </svg>
    ),
  },
  {
    label: "View Cover Letter" as const,
    Icon: PiFile,
  },
  {
    label: "Add to Pipeline" as const,
    Icon: PiUserPlus,
  },
];
