import Link from "next/link";
import { Metadata } from "next";
import { IoMdBusiness } from "react-icons/io";

import { IconType } from "react-icons";
import AuthFormPageWrapper from "../common/components/Forms/AuthFormPageWrapper";
import LoginUpgradeModal from "@/app/common/components/LoginUpgradeModal";

export const metadata: Metadata = {
  title: "Onboarding",
};

const TalentIcon: IconType = propa => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    width='25'
    height='24'
    viewBox='0 0 25 24'
    fill='none'
    {...propa}
  >
    <path
      d='M11.7403 10.7933C14.1188 10.7933 16.0469 8.8651 16.0469 6.4866C16.0469 4.10809 14.1188 2.17993 11.7403 2.17993C9.36175 2.17993 7.43359 4.10809 7.43359 6.4866C7.43359 8.8651 9.36175 10.7933 11.7403 10.7933Z'
      fill='#4F5254'
    />
    <path d='M14.5 18.6667H19.1667V19.6001H14.5V18.6667Z' fill='#4F5254' />
    <path
      d='M10.4991 19.9999V21.9999C10.4991 22.1767 10.5694 22.3463 10.6944 22.4713C10.8194 22.5963 10.989 22.6666 11.1658 22.6666H22.4991C22.6759 22.6666 22.8455 22.5963 22.9705 22.4713C23.0956 22.3463 23.1658 22.1767 23.1658 21.9999V15.3332C23.1658 15.1564 23.0956 14.9869 22.9705 14.8618C22.8455 14.7368 22.6759 14.6666 22.4991 14.6666H17.8325V13.6866C17.8325 13.5098 17.7622 13.3402 17.6372 13.2152C17.5122 13.0902 17.3426 13.0199 17.1658 13.0199C16.989 13.0199 16.8194 13.0902 16.6944 13.2152C16.5694 13.3402 16.4991 13.5098 16.4991 13.6866V14.6666H15.1658V12.2799C14.0329 12.0949 12.887 12.0013 11.7391 11.9999C9.20766 11.9891 6.70456 12.533 4.40579 13.5932C4.02745 13.7718 3.70826 14.0551 3.48611 14.4096C3.26396 14.7641 3.14816 15.1749 3.15246 15.5932V19.9999H10.4991ZM21.8325 21.3332H11.8325V15.9999H16.4991V16.2799C16.4991 16.4567 16.5694 16.6263 16.6944 16.7513C16.8194 16.8763 16.989 16.9466 17.1658 16.9466C17.3426 16.9466 17.5122 16.8763 17.6372 16.7513C17.7622 16.6263 17.8325 16.4567 17.8325 16.2799V15.9999H21.8325V21.3332Z'
      fill='#4F5254'
    />
  </svg>
);

const roles: RoleProps[] = [
  {
    role: "startup",
    detail: "I'm looking for skilled candidates to work for me.",
    Icon: IoMdBusiness,
    link: "https://cal.com/tiaago/book-a-demo-tiaago-ai-hiring-platform",
  },
  {
    role: "talent",
    detail: "I have skills and I'm looking for an employer to work for.",
    Icon: TalentIcon,
  },
];

const Onboarding = async ({
  searchParams,
}: {
  searchParams: Promise<{ as?: string; referral_code?: string }>;
}) => {
  const { as, referral_code } = await searchParams;
  const role = as === "talent" ? "talent" : "startup";
  return (
    <AuthFormPageWrapper
      as={role}
      title='Create An Account'
      description='Get access to lots of talent and more'
      unconstrainedWidth
      containerClassName='flex flex-col items-start max-w-[356px]'
      titleContainerClassName='pl-5'
    >
      <LoginUpgradeModal />
      <div className='px-2.5 space-y-8 mt-14'>
        {roles.map(role => (
          <Role key={role.role} {...role} referral_code={referral_code} />
        ))}
      </div>
    </AuthFormPageWrapper>
  );
};

export default Onboarding;

type RoleProps = {
  role: "talent" | "startup";
  Icon: IconType;
  detail: string;
  referral_code?: string;
  link?: string;
};

const Role = (props: RoleProps) => {
  return (
    <Link
      href={
        props.link
          ? props.link
          : `/${props.role}s/signup${
              props.referral_code ? `?referral_code=${props.referral_code}` : ""
            }`
      }
      target={props.link ? "_blank" : undefined}
      rel={props.link ? "noopener noreferrer" : undefined}
      className='flex gap-7 items-start border-2 rounded-[10px] px-6 py-7 cursor-pointer hover:border-primary focus:border-primary'
    >
      <div className='flex shrink-0 p-3 items-center justify-center bg-[#EBECEE] rounded-full'>
        <props.Icon className='text-2xl text-[##4F5254]' />
      </div>
      <div>
        <h2 className='font-switzer font-bold text-2xl capitalize'>
          {props.role === "startup" ? "Recruiter" : "Talent"}
        </h2>
        <p className='font-poppins text-base text-[#686b6d] mt-3'>
          {props.detail}
        </p>
      </div>
      <span className='border-2 rounded-full w-5 p-2'></span>
    </Link>
  );
};
