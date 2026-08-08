import Link from "next/link";
import { Metadata } from "next";
import { IoMdBusiness } from "react-icons/io";

import { IconType } from "react-icons";
import AuthFormPageWrapper from "../common/components/Forms/AuthFormPageWrapper";
import LoginUpgradeModal from "@/app/common/components/LoginUpgradeModal";

export const metadata: Metadata = {
  title: "Onboarding",
};

const roles: RoleProps[] = [
  {
    role: "recruiter",
    detail: "I'm looking for skilled candidates to work for me.",
    Icon: IoMdBusiness,
    link: "https://cal.com/tiaago/book-a-demo-tiaago-ai-hiring-platform",
  },
];

const Onboarding = async ({
  searchParams,
}: {
  searchParams: Promise<{ as?: string; referral_code?: string }>;
}) => {
  const { as, referral_code } = await searchParams;
  const role = as === "talent" ? "talent" : "recruiter";
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
  role: "talent" | "recruiter";
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
          {props.role === "recruiter" ? "Recruiter" : "Talent"}
        </h2>
        <p className='font-poppins text-base text-[#686b6d] mt-3'>
          {props.detail}
        </p>
      </div>
      <span className='border-2 rounded-full w-5 p-2'></span>
    </Link>
  );
};
