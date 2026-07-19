import type { IconBaseProps } from "react-icons";
import { PiExam } from "react-icons/pi";
import type { DashboardNavItemV3 } from "@/app/common/types";
import {
  IoBusinessOutline,
  IoMailOutline,
  IoNewspaperOutline,
  IoSettingsOutline,
  IoCashOutline,
  IoFunnelOutline,
  IoGitNetworkOutline,
  IoTrendingUpOutline,
  IoAnalyticsOutline,
  IoPulseOutline,
  IoNotificationsOutline,
  IoShieldCheckmarkOutline,
  IoPricetagsOutline,
  IoCalculatorOutline,
  IoHelpBuoyOutline,
  IoPeopleOutline,
} from "react-icons/io5";

const baseHref = "/admin";


export const navItems: DashboardNavItemV3[] = [
  {
    name: "assessment",
    href: `${baseHref}/assessment`,
    Icon: PiExam,
    section: "assessment_moderation",
    subLinks: [
      {
        name: "Assessments",
        href: `${baseHref}/assessment/assessments`,
      },
      {
        name: "Objective",
        href: `${baseHref}/assessment/objective`,
      },
      {
        name: "Case Studies",
        href: `${baseHref}/assessment/case-studies`,
      },
      {
        name: "Approval",
        href: `${baseHref}/assessment/approval`,
      },
    ],
  },
  {
    name: "blog",
    href: `${baseHref}/blog`,
    Icon: IoNewspaperOutline,
    section: "blog",
  },
  {
    name: "email logs",
    href: `${baseHref}/email-logs`,
    Icon: IoMailOutline,
    section: "email_logs",
  },
  {
    name: "notifications",
    href: `${baseHref}/notifications`,
    Icon: IoNotificationsOutline,
    section: "notifications",
  },
  {
    name: "jobs",
    href: `${baseHref}/jobs`,
    section: "jobs",
    Icon: (props: IconBaseProps) => (
      <svg
        xmlns='http://www.w3.org/2000/svg'
        width='24'
        height='24'
        viewBox='0 0 24 24'
        {...props}
      >
        <path d='M16.0002 22.75H8.00023C3.38023 22.75 2.52023 20.6 2.30023 18.51L1.55023 10.5C1.44023 9.45001 1.41023 7.90001 2.45023 6.74001C3.35023 5.74001 4.84023 5.26001 7.00023 5.26001H17.0002C19.1702 5.26001 20.6602 5.75001 21.5502 6.74001C22.5902 7.90001 22.5602 9.45001 22.4502 10.51L21.7002 18.5C21.4802 20.6 20.6202 22.75 16.0002 22.75ZM7.00023 6.75001C5.31023 6.75001 4.15023 7.08001 3.56023 7.74001C3.07023 8.28001 2.91023 9.11001 3.04023 10.35L3.79023 18.36C3.96023 19.94 4.39023 21.25 8.00023 21.25H16.0002C19.6002 21.25 20.0402 19.94 20.2102 18.35L20.9602 10.36C21.0902 9.11001 20.9302 8.28001 20.4402 7.74001C19.8502 7.08001 18.6902 6.75001 17.0002 6.75001H7.00023Z' />
        <path d='M16 6.75C15.59 6.75 15.25 6.41 15.25 6V5.2C15.25 3.42 15.25 2.75 12.8 2.75H11.2C8.75 2.75 8.75 3.42 8.75 5.2V6C8.75 6.41 8.41 6.75 8 6.75C7.59 6.75 7.25 6.41 7.25 6V5.2C7.25 3.44 7.25 1.25 11.2 1.25H12.8C16.75 1.25 16.75 3.44 16.75 5.2V6C16.75 6.41 16.41 6.75 16 6.75Z' />
        <path d='M12 16.75C9.25 16.75 9.25 15.05 9.25 14.03V13C9.25 11.59 9.59 11.25 11 11.25H13C14.41 11.25 14.75 11.59 14.75 13V14C14.75 15.04 14.75 16.75 12 16.75ZM10.75 12.75C10.75 12.83 10.75 12.92 10.75 13V14.03C10.75 15.06 10.75 15.25 12 15.25C13.25 15.25 13.25 15.09 13.25 14.02V13C13.25 12.92 13.25 12.83 13.25 12.75C13.17 12.75 13.08 12.75 13 12.75H11C10.92 12.75 10.83 12.75 10.75 12.75Z' />
        <path d='M13.9995 14.77C13.6295 14.77 13.2995 14.49 13.2595 14.11C13.2095 13.7 13.4995 13.32 13.9095 13.27C16.5495 12.94 19.0795 11.94 21.2095 10.39C21.5395 10.14 22.0095 10.22 22.2595 10.56C22.4995 10.89 22.4295 11.36 22.0895 11.61C19.7495 13.31 16.9895 14.4 14.0895 14.77C14.0595 14.77 14.0295 14.77 13.9995 14.77Z' />
        <path d='M10.0007 14.7799C9.97072 14.7799 9.94072 14.7799 9.91072 14.7799C7.17072 14.4699 4.50072 13.4699 2.19072 11.8899C1.85072 11.6599 1.76072 11.1899 1.99072 10.8499C2.22072 10.5099 2.69072 10.4199 3.03072 10.6499C5.14072 12.0899 7.57072 12.9999 10.0707 13.2899C10.4807 13.3399 10.7807 13.7099 10.7307 14.1199C10.7007 14.4999 10.3807 14.7799 10.0007 14.7799Z' />
      </svg>
    ),
  },
  {
    name: "recruiters",
    href: `${baseHref}/recruiters`,
    Icon: IoBusinessOutline,
    section: "recruiters",
  },
  {
    name: "talents",
    href: `${baseHref}/talents`,
    section: "talents",
    Icon: (props: IconBaseProps) => (
      <svg
        xmlns='http://www.w3.org/2000/svg'
        width='24'
        height='24'
        viewBox='0 0 24 24'
        {...props}
      >
        <path d='M12 22.7501C11.4 22.7501 10.81 22.6101 10.33 22.3401L5.60001 19.6101C3.64001 18.2901 3.51001 18.0501 3.51001 15.9801V11.0201C3.51001 8.95006 3.64001 8.71006 5.56001 7.42006L10.34 4.66006C11.29 4.11006 12.72 4.11006 13.67 4.66006L18.4 7.39006C20.36 8.71006 20.49 8.95006 20.49 11.0201V15.9801C20.49 18.0501 20.36 18.2901 18.44 19.5801L13.66 22.3401C13.19 22.6201 12.59 22.7501 12 22.7501ZM12 5.75006C11.66 5.75006 11.32 5.82006 11.08 5.96006L6.35001 8.69006C5.01001 9.60006 5.01001 9.60006 5.01001 11.0201V15.9801C5.01001 17.4001 5.01001 17.4001 6.40001 18.3401L11.09 21.0401C11.57 21.3201 12.44 21.3201 12.92 21.0401L17.65 18.3101C18.99 17.4001 18.99 17.4001 18.99 15.9801V11.0201C18.99 9.60006 18.99 9.60006 17.6 8.66006L12.91 5.96006C12.68 5.82006 12.34 5.75006 12 5.75006Z' />
        <path d='M17.5 8.38C17.09 8.38 16.75 8.04 16.75 7.63V5C16.75 3.42 16.08 2.75 14.5 2.75H9.5C7.92 2.75 7.25 3.42 7.25 5V7.56C7.25 7.97 6.91 8.31 6.5 8.31C6.09 8.31 5.75 7.98 5.75 7.56V5C5.75 2.58 7.08 1.25 9.5 1.25H14.5C16.92 1.25 18.25 2.58 18.25 5V7.63C18.25 8.04 17.91 8.38 17.5 8.38Z' />
        <path d='M13.63 17.6301C13.42 17.6301 13.2 17.5901 12.98 17.5001L12 17.1201L11.02 17.5101C10.49 17.7201 9.94999 17.6701 9.54999 17.3801C9.14999 17.0901 8.93999 16.5901 8.96999 16.0201L9.02999 14.9701L8.35999 14.1601C7.99999 13.7101 7.87999 13.1901 8.03999 12.7101C8.18999 12.2401 8.59999 11.8801 9.14999 11.7401L10.17 11.4801L10.74 10.5901C11.35 9.63012 12.66 9.63012 13.27 10.5901L13.84 11.4801L14.86 11.7401C15.41 11.8801 15.82 12.2401 15.97 12.7101C16.12 13.1801 16 13.7101 15.64 14.1501L14.97 14.9601L15.03 16.0101C15.06 16.5801 14.85 17.0701 14.45 17.3701C14.21 17.5401 13.93 17.6301 13.63 17.6301ZM9.51999 13.2001L10.19 14.0101C10.42 14.2801 10.55 14.7101 10.53 15.0601L10.47 16.1101L11.45 15.7201C11.78 15.5901 12.22 15.5901 12.55 15.7201L13.53 16.1101L13.47 15.0601C13.45 14.7101 13.58 14.2901 13.81 14.0101L14.48 13.2001L13.46 12.9401C13.12 12.8501 12.76 12.5901 12.57 12.3001L12.01 11.4201L11.44 12.3001C11.25 12.6001 10.89 12.8601 10.55 12.9501L9.51999 13.2001Z' />
      </svg>
    ),
  },
  {
    name: "settings",
    href: `${baseHref}/settings`,
    Icon: IoSettingsOutline,
    subLinks: [
      {
        name: "Profile",
        href: `${baseHref}/settings?tab=profile`,
      },
      {
        name: "Security",
        href: `${baseHref}/settings?tab=security`,
      },
    ],
  },
  { type: "divider" },
  {
    name: "organisations",
    href: `${baseHref}/organisations`,
    Icon: IoBusinessOutline,
    section: "organisations",
  },
  {
    name: "revenue",
    href: `${baseHref}/revenue`,
    Icon: IoCashOutline,
    section: "revenue",
  },
  {
    name: "pricing",
    href: `${baseHref}/pricing`,
    Icon: IoCalculatorOutline,
    section: "pricing",
  },
  {
    name: "support",
    href: `${baseHref}/support`,
    Icon: IoHelpBuoyOutline,
    section: "support",
  },
  {
    name: "funnel",
    href: `${baseHref}/funnel`,
    Icon: IoFunnelOutline,
    section: "funnel",
  },
  {
    name: "pipeline",
    href: `${baseHref}/pipeline`,
    Icon: IoGitNetworkOutline,
    section: "pipeline",
  },
  {
    name: "growth",
    href: `${baseHref}/growth`,
    Icon: IoTrendingUpOutline,
    section: "growth",
  },
  {
    name: "assessments",
    href: `${baseHref}/assessments`,
    Icon: IoAnalyticsOutline,
    section: "assessment_analytics",
  },
  {
    name: "proctoring",
    href: `${baseHref}/proctoring`,
    Icon: IoShieldCheckmarkOutline,
    section: "proctoring",
  },
  {
    name: "system health",
    href: `${baseHref}/system`,
    Icon: IoPulseOutline,
    section: "system_health",
  },
  {
    name: "marketing",
    href: `${baseHref}/tags`,
    Icon: IoPricetagsOutline,
    section: "marketing",
    subLinks: [
      { name: "Tags", href: `${baseHref}/tags`, section: "tags" },
      { name: "Segments", href: `${baseHref}/segments`, section: "tags" },
      { name: "Campaigns", href: `${baseHref}/campaigns`, section: "campaigns" },
    ],
  },
  {
    name: "staff",
    href: `${baseHref}/staff`,
    Icon: IoPeopleOutline,
    section: "staff",
  },
];
