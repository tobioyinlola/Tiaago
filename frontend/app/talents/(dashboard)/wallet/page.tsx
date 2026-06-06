import Link from "next/link";
import Image from "next/image";
import { Metadata } from "next";
import { Fragment } from "react";
import { format } from "date-fns";
import { capitalize } from "lodash";
import { IoIosLink } from "react-icons/io";

import {
  getCurrentUser,
  getReferralRewardsWallet,
  getUserReferralCode,
  getUsersReferred,
} from "@/app/common/services/profile";

import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import { IconBaseProps } from "react-icons";
import { Talent } from "@/app/common/types";
import { BASE_URL } from "@/app/common/constants";
import UserAvatar from "@/app/common/components/UserAvatar";
import SendReferralInvite from "./_components/SendReferralInvite";
import CopyToClipboard from "@/app/common/components/CopyToClipboard";
import { EmptyStateV3 } from "@/app/common/components/dashboard/EmptyState";
import { cn, formatPrice, handleServerApiCallError } from "@/app/common/utils";
import ServerPagination from "@/app/common/components/ServerPagination";
import WithdrawReferralRewards from "./_components/WithdrawReferralRewards";

const tabs = ["payment", "referral"] as const;
type Tab = (typeof tabs)[number];

const getTab = (tab: string = "payment"): Tab => {
  if (
    // @ts-ignore
    !tabs.includes(tab)
  )
    tab = "payment";
  return tab as Tab;
};

export const generateMetadata = async ({
  searchParams,
}: Props): Promise<Metadata> => {
  const resolvedSearchParams = await searchParams;
  let tab = getTab(resolvedSearchParams.tab);
  return { title: capitalize(tab) };
};

type Props = {
  searchParams: Promise<{
    tab?: string;
    page?: string;
  }>;
};

const TalentWallet = async ({ searchParams }: Props) => {
  const resolvedSearchParams = await searchParams;
  const tab = getTab(resolvedSearchParams.tab);
  const currentUser = (await getCurrentUser("talent")).currentUser;

  return (
    <>
      {/* Tabs */}
      <div
        role='tablist'
        className='tabs tabs-bordered border-gray-200 pb-8 max-w-[1800px]'
      >
        {tabs.map(name => (
          <Fragment key={name}>
            <Link
              href={`?tab=${name}`}
              role='tab'
              className={cn(
                "tab !border-gray-200 text-sm md:text-base font-medium text-gray-500",
                name === tab && "tab-active !border-primary text-primary"
              )}
              aria-label={name}
            >
              <span className='capitalize'>{name}</span>
            </Link>
            <div role='tabpanel' className='tab-content py-8 w-full'>
              {tab === name && name === "payment" ? (
                <PaymentPage currentUser={currentUser} />
              ) : (
                <ReferralPage
                  searchParams={searchParams}
                  currentUser={currentUser}
                />
              )}
            </div>
          </Fragment>
        ))}
      </div>
    </>
  );
};

export default TalentWallet;

const MailIcon = () => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    width='23'
    height='20'
    viewBox='0 0 23 20'
    fill='none'
  >
    <path
      d='M1.59766 4L8.51068 7.91697C11.0593 9.36101 12.1361 9.36101 14.6846 7.91697L21.5977 4'
      stroke='#3580B5'
      strokeWidth='1.5'
      strokeLinejoin='round'
    />
    <path
      d='M1.61342 11.4756C1.6788 14.5412 1.71148 16.0739 2.84261 17.2094C3.97374 18.3448 5.54799 18.3843 8.69649 18.4634C10.637 18.5122 12.5584 18.5122 14.4988 18.4634C17.6473 18.3843 19.2216 18.3448 20.3527 17.2094C21.4838 16.0739 21.5165 14.5412 21.5819 11.4756C21.6029 10.4899 21.6029 9.51008 21.5819 8.52439C21.5165 5.45886 21.4838 3.92609 20.3527 2.79066C19.2216 1.65523 17.6473 1.61568 14.4988 1.53657C12.5583 1.48781 10.637 1.48781 8.69648 1.53656C5.54799 1.61566 3.97374 1.65521 2.84261 2.79065C1.71148 3.92608 1.67879 5.45885 1.61342 8.52438C1.5924 9.51007 1.5924 10.4899 1.61342 11.4756Z'
      stroke='#3580B5'
      strokeWidth='1.5'
      strokeLinejoin='round'
    />
  </svg>
);

const IdIcon = () => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    width='22'
    height='22'
    viewBox='0 0 22 22'
    fill='none'
  >
    <path
      d='M8.33159 1.5C5.66531 1.56075 4.10797 1.81456 3.04391 2.87493C2.11263 3.80297 1.80133 5.10756 1.69727 7.2M14.0629 1.5C16.7292 1.56075 18.2866 1.81456 19.3506 2.87493C20.2819 3.80297 20.5932 5.10756 20.6973 7.2M14.0629 20.5C16.7292 20.4392 18.2866 20.1854 19.3506 19.1251C20.2819 18.197 20.5932 16.8924 20.6973 14.8M8.33159 20.5C5.66531 20.4392 4.10797 20.1854 3.04391 19.1251C2.11263 18.197 1.80133 16.8924 1.69727 14.8'
      stroke='#3580B5'
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
    <path
      d='M6.69727 16C9.02897 13.5578 13.3405 13.4428 15.6973 16M13.6924 8.5C13.6924 9.88071 12.5715 11 11.1888 11C9.80612 11 8.68523 9.88071 8.68523 8.5C8.68523 7.11929 9.80612 6 11.1888 6C12.5715 6 13.6924 7.11929 13.6924 8.5Z'
      stroke='#3580B5'
      strokeWidth='1.5'
      strokeLinecap='round'
    />
  </svg>
);

const MoneyBagIcon = () => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    width='20'
    height='22'
    viewBox='0 0 20 22'
    fill='none'
  >
    <path
      d='M18.7396 15.8354C18.0833 11.8866 16.0401 8.94613 14.2638 7.219C13.747 6.71642 13.4885 6.46513 12.9177 6.23257C12.3468 6 11.8561 6 10.8747 6H8.7191C7.73768 6 7.24697 6 6.67609 6.23257C6.10521 6.46513 5.84678 6.71642 5.32992 7.219C3.55369 8.94613 1.51048 11.8866 0.854142 15.8354C0.365805 18.7734 3.07615 21 6.1052 21H13.4886C16.5176 21 19.2279 18.7734 18.7396 15.8354Z'
      stroke='#3580B5'
      strokeWidth='1.5'
      strokeLinecap='round'
    />
    <path
      d='M10.4599 10C10.4599 9.58579 10.1241 9.25 9.70992 9.25C9.29571 9.25 8.95992 9.58579 8.95992 10L10.4599 10ZM8.95992 17C8.95992 17.4142 9.2957 17.75 9.70992 17.75C10.1241 17.75 10.4599 17.4142 10.4599 17H8.95992ZM10.7825 11.9539C11.0332 12.2836 11.5037 12.3477 11.8335 12.0971C12.1632 11.8464 12.2274 11.3759 11.9767 11.0461L10.7825 11.9539ZM8.54407 15.1022C8.23542 14.826 7.76127 14.8523 7.48504 15.1609C7.2088 15.4696 7.23509 15.9437 7.54374 16.22L8.54407 15.1022ZM9.70992 12.6493C9.06262 12.6493 8.76792 12.5437 8.65068 12.4647C8.5969 12.4285 8.54688 12.3874 8.54688 12.1895H7.04688C7.04688 12.771 7.25772 13.3349 7.81263 13.7088C8.30409 14.0398 8.96592 14.1493 9.70992 14.1493V12.6493ZM8.54688 12.1895C8.54688 12.094 8.5977 11.946 8.80248 11.7949C9.00702 11.6439 9.3254 11.5279 9.70992 11.5279V10.0279C9.03789 10.0279 8.39975 10.2279 7.9119 10.5879C7.4243 10.9476 7.04688 11.5054 7.04688 12.1895H8.54688ZM11.0469 14.8109C11.0469 15.0328 10.968 15.1505 10.7994 15.2518C10.5854 15.3804 10.218 15.4724 9.70992 15.4724V16.9724C10.3544 16.9724 11.0305 16.8628 11.5718 16.5376C12.1586 16.1852 12.5469 15.5971 12.5469 14.8109H11.0469ZM9.70992 14.1493C10.3633 14.1493 10.7039 14.2499 10.8654 14.3552C10.9594 14.4165 11.0469 14.5063 11.0469 14.8109H12.5469C12.5469 14.1072 12.2865 13.4912 11.6848 13.0988C11.1507 12.7504 10.4479 12.6493 9.70992 12.6493V14.1493ZM10.4599 10.7779L10.4599 10L8.95992 10L8.95992 10.7779L10.4599 10.7779ZM8.95992 16.2224V17H10.4599V16.2224H8.95992ZM9.70992 11.5279C10.2448 11.5279 10.6256 11.7474 10.7825 11.9539L11.9767 11.0461C11.4786 10.3908 10.6094 10.0279 9.70992 10.0279V11.5279ZM9.70992 15.4724C9.17652 15.4724 8.76199 15.2972 8.54407 15.1022L7.54374 16.22C8.08776 16.7068 8.88219 16.9724 9.70992 16.9724V15.4724Z'
      fill='#3580B5'
    />
    <path
      d='M5.0535 3.44287C4.84719 3.14258 4.54815 2.73499 5.16587 2.64205C5.80079 2.54651 6.46009 2.98114 7.10542 2.97221C7.68924 2.96413 7.98668 2.70519 8.30579 2.33548C8.64181 1.94617 9.1621 1 9.79687 1C10.4316 1 10.9519 1.94617 11.288 2.33548C11.6071 2.70519 11.9045 2.96413 12.4883 2.97221C13.1337 2.98114 13.793 2.54651 14.4279 2.64205C15.0456 2.73499 14.7466 3.14258 14.5403 3.44287L13.6074 4.80064C13.2084 5.38146 13.0089 5.67187 12.5913 5.83594C12.1738 6 11.6342 6 10.5551 6H9.03868C7.95954 6 7.41997 6 7.00243 5.83594C6.58489 5.67187 6.38537 5.38146 5.98633 4.80064L5.0535 3.44287Z'
      stroke='#3580B5'
      strokeWidth='1.5'
    />
  </svg>
);

const UserGroupIcon = ({
  className = "text-[#16405C]",
  ...props
}: IconBaseProps) => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    width='25'
    height='18'
    viewBox='0 0 25 18'
    fill='none'
    {...props}
    className={className}
  >
    <path
      d='M21.274 15C22.0233 15 22.6193 14.5285 23.1545 13.8691C24.2499 12.5194 22.4513 11.4408 21.7654 10.9126C21.068 10.3756 20.2894 10.0714 19.5 10M18.5 8C19.8807 8 21 6.88071 21 5.5C21 4.11929 19.8807 3 18.5 3'
      stroke='currentColor'
      strokeWidth='1.5'
      strokeLinecap='round'
    />
    <path
      d='M3.72596 15C2.97666 15 2.38067 14.5285 1.84555 13.8691C0.750089 12.5194 2.54867 11.4408 3.23465 10.9126C3.93197 10.3756 4.71058 10.0714 5.5 10M6 8C4.61929 8 3.5 6.88071 3.5 5.5C3.5 4.11929 4.61929 3 6 3'
      stroke='currentColor'
      strokeWidth='1.5'
      strokeLinecap='round'
    />
    <path
      d='M8.5838 12.1112C7.56203 12.743 4.88299 14.0331 6.5147 15.6474C7.31178 16.436 8.19952 17 9.31563 17H15.6844C16.8005 17 17.6882 16.436 18.4853 15.6474C20.117 14.0331 17.438 12.743 16.4162 12.1112C14.0201 10.6296 10.9799 10.6296 8.5838 12.1112Z'
      fill='currentColor'
      stroke='currentColor'
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
    <path
      d='M16 4.5C16 6.433 14.433 8 12.5 8C10.567 8 9 6.433 9 4.5C9 2.567 10.567 1 12.5 1C14.433 1 16 2.567 16 4.5Z'
      stroke='currentColor'
      strokeWidth='1.5'
    />
  </svg>
);

const PaymentPage = ({ currentUser }: { currentUser: Talent }) => (
  <>
    <div className='w-full mb-8'>
      <h1 className='text-2xl font-semibold mb-2 font-switzer text-primary-black'>
        Payment Overview
      </h1>
      <h4 className='text-secondary-black text-base'>
        Get a complete snapshot of your payment history and transactions.
      </h4>
    </div>

    <div className='grid sm:items-center sm:grid-cols-2 xl:grid-cols-3 max-w-[1012px] gap-8 mt-9 mb-[60px]'>
      <WalletBalanceCard />
      <div className='w-full h-[174px] flex flex-col justify-between gap-4 font-poppins rounded-xl text-[#FEFEFF] py-3 px-6 bg-[#16405C]'>
        <div className='flex items-center justify-between'>
          <h6 className='text-sm text-[15px] font-semibold'>Linked Account</h6>
          <InfoCircleIcon />
        </div>
        <div className='flex gap-3'>
          <div className='bg-white w-[38px] h-[38px] rounded-full flex items-center justify-center'>
            <UserGroupIcon />
          </div>
          {!!currentUser.account_number && (
            <div className='space-y-1 text-white'>
              <h6 className='text-xl font-medium'>
                {currentUser.account_number}
              </h6>
              <h6 className='text-xl font-medium'>
                {currentUser.account_name}
              </h6>
              <h6 className='text-xl font-medium'>{currentUser.bank_name}</h6>
            </div>
          )}
          {currentUser.account_number ? (
            <div />
          ) : (
            <div className='text-white'>
              <h6 className='text-xl font-medium'>No linked account</h6>
              <Link
                href='/talents/settings#bank-details'
                className='btn btn-sm h-10 w-full mt-2 hover:bg-white bg-white text-[#16405C] p-2 rounded-lg font-medium text-sm'
              >
                Link account
              </Link>
            </div>
          )}
        </div>
      </div>
      <div className='w-full h-[174px] flex flex-col gap-4 font-poppins rounded-xl text-[#FEFEFF] px-6 py-3.5 bg-[#ACB1B5]'>
        <div className='flex items-center justify-between'>
          <h6 className='text-sm text-[15px] font-semibold'>Pending Payment</h6>
          <InfoCircleIcon />
        </div>
        <div>
          <h3 className='justify-center flex items-center text-xs'>
            <span className='font-semibold text-3xl text-[32px] mr-0.5'>
              0.00
            </span>
            USD
          </h3>
          <h5 className='text-center text-xs mt-1'>Waiting on approval</h5>
        </div>
      </div>
    </div>

    <div className='w-full rounded-t-xl pl-6 pr-2 h-20 border border-[#F5F5F5] bg-[#EBECEE] flex items-center'>
      <h2 className='text-base md:text-lg font-semibold text-[#343A40]'>
        Payment History
      </h2>
    </div>
    <div className='bg-white border border-[#E1E3E5] rounded-b-xl flex-1'>
      <EmptyStateV3
        imgHeight={150}
        imgWidth={150}
        text='No payment history'
        subText='When you schedule a payment, it will appear here'
      />
    </div>

    <div className='w-full rounded-t-xl pl-6 pr-2 h-20 border border-[#F5F5F5] bg-[#EBECEE] flex items-center mt-10'>
      <h2 className='text-base md:text-lg font-semibold text-[#343A40]'>
        Withdrawal History
      </h2>
    </div>
    <div className='bg-white border border-[#E1E3E5] rounded-b-xl flex-1'>
      <EmptyStateV3
        imgHeight={150}
        imgWidth={150}
        text='No withdrawal history'
        subText='When you schedule a withdrawal, it will appear here'
      />
    </div>
  </>
);

const steps = [
  {
    Icon: MailIcon,
    title: "Share your unique referral link",
    description:
      "Get your personalized referral link and share it via email, social media or directly with friends and colleague.",
  },
  {
    Icon: IdIcon,
    title: "Your referrals Join Tiago",
    description:
      "When your friends sign up using your referral link, they will enjoy exclusive benefits and access to our platforms.",
  },
  {
    Icon: MoneyBagIcon,
    title: "Earn rewards",
    description:
      "For each successful referral, you'll earn exciting rewards. The more you refer, the more you earn.",
  },
];

const ReferralPage = async ({
  searchParams,
  currentUser,
}: {
  searchParams: Promise<any>;
  currentUser: Talent;
}) => {
  const resolvedSearchParams = await searchParams;
  const page = resolvedSearchParams.page
    ? parseInt(resolvedSearchParams.page)
    : 1;
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const referralCodeRes = await getUserReferralCode().catch(async e => {
    const error = await handleServerApiCallError(e);
    console.log("Get referral code error (Wallet => Referral): ", error);
    errors.push({
      message: error,
      title: "Error getting referral code",
    });
    return null;
  });
  const usersReferredRes = await getUsersReferred(page).catch(async e => {
    const error = await handleServerApiCallError(e);
    console.log("Get users referred error (Wallet => Referral): ", error);
    errors.push({
      message: error,
      title: "Error getting users referred",
    });
    return null;
  });
  const referralRewardsWallet = await getReferralRewardsWallet().catch(
    async e => {
      const error = await handleServerApiCallError(e);
      console.log(
        "Get referral rewards wallet error (Wallet => Referral): ",
        error
      );
      errors.push({
        message: error,
        title: "Error getting referral rewards wallet",
      });
      return {
        balance: "0.00",
        total_earned: "0.00",
        total_withdrawn: "0.00",
      };
    }
  );
  const usersReferred = usersReferredRes?.results;
  const referralCode = referralCodeRes?.referral_code;
  const referralLink = `${BASE_URL}/onboarding?referral_code=${referralCode}`;
  return (
    <>
      <div className='w-full mb-8'>
        <h1 className='text-2xl font-semibold mb-2 font-switzer text-primary-black'>
          Refer a friend, Get a bonus.
        </h1>
        <h4 className='text-secondary-black text-base'>
          Help your friends find great opportunity and earn rewards.
        </h4>
      </div>

      <div className='grid sm:grid-cols-2 xl:grid-cols-3 sm:items-center max-w-[1012px] gap-8 mt-9 mb-7'>
        <WalletBalanceCard
          balance={referralRewardsWallet?.balance}
          currency='NGN'
          isReferralRewards
          currentUser={currentUser}
        />
        <div className='w-full h-[174px] flex flex-col gap-3 font-poppins rounded-xl text-white pl-6 pt-7 bg-[#ACB1B5]'>
          <h6 className='text-xl font-semibold text-[#FEFEFF]'>
            Candidates Referred
          </h6>

          <div className='flex items-center gap-3'>
            <div className='bg-white w-[38px] h-[38px] rounded-full flex items-center justify-center'>
              <UserGroupIcon className='text-primary' />
            </div>
            <h2 className='text-2xl font-medium'>
              {usersReferredRes?.count || 0}
            </h2>
          </div>

          <div className='mt-auto w-full relative h-8'>
            <Image
              className='object-right-bottom object-cover'
              fill
              src='/assets/images/lines.png'
              alt=''
            />
          </div>
        </div>
      </div>
      <div>
        <h3 className='text-[#1F2C39] font-bold text-base pb-4 mb-6 border-b border-[#EAECF0]'>
          Here&apos;s how it works 👇🏼
        </h3>
        <div className='flex items-center flex-wrap gap-12 xl:justify-between'>
          {steps.map((step, index) => {
            return (
              <div
                key={index}
                className='bg-white px-4 py-6 rounded-xl sm:max-w-[324px] flex flex-col'
              >
                <div className='w-12 h-12 rounded-full flex items-center justify-center bg-[#EDF8FF]'>
                  <step.Icon />
                </div>
                <h3 className='mt-[18px] mb-3 text-primary-black text-base font-semibold'>{`${
                  index + 1
                }. ${step.title}`}</h3>
                <p className='text-sm text-secondary-black'>
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className='mt-14'>
        <h3 className='text-[#1F2C39] font-bold text-base'>Refer a friend</h3>
        <p className='text-sm text-secondary-black mt-0.5 pb-4 mb-6 border-b border-[#EAECF0]'>
          Choose referral method
        </p>
        <div className='flex items-center flex-wrap md:grid grid-cols-4 gap-3 pb-8 mb-8 border-b border-[#EAECF0]'>
          <h3 className='text-[#344054] font-medium text-base max-md:w-full'>
            Invite Link
          </h3>
          <div className='input flex-1 col-span-2 border-[#BDC3C7] text-[#667085] py-0.5 sm:col-span-2 flex items-center gap-2'>
            <IoIosLink className='text-base text-[#98A2B3]' />
            <h6 className='grow break-all wrap-anywhere'>
              {referralLink.split("//").at(1)}
            </h6>
          </div>
          <CopyToClipboard
            className='btn btn-sm btn-primary h-11 rounded-lg px-6 text-white ml-auto text-sm'
            text={referralLink}
          >
            <span className='text-xs max-md:hidden'>Copy Link</span>
          </CopyToClipboard>
        </div>
        <SendReferralInvite />
      </div>
      <div className='mt-20'>
        <h3 className='text-[#1F2C39] font-bold text-base'>Referrals</h3>
        <p className='text-sm text-secondary-black mt-0.5 pb-4 mb-3 border-b border-[#EAECF0]'>
          People you referred.
        </p>
        <div className='space-y-2'>
          {(usersReferred || []).map((referral, index) => {
            const [firstName, lastName] = referral.invitee_name.split(" ");
            return (
              <div
                key={index}
                className='flex items-center justify-between p-2.5 text-[#344054] text-sm border-b border-[#EAECF0]'
              >
                <div className='flex items-center gap-3 w-1/3 lg:w-2/5'>
                  <UserAvatar
                    firstName={firstName}
                    lastName={lastName}
                    className='w-10 text-sm'
                    profilePic={referral.invitee_profile_pic}
                  />
                  <h2 className='font-medium text-base'>
                    {referral.invitee_name}
                  </h2>
                </div>
                <p className='w-1/5 text-left'>{referral.invitee_email}</p>
                <p className='w-1/5 text-center'>
                  {formatPrice({
                    price: +referral.reward,
                    noOfDigits: 0,
                  })}
                </p>
                <p className='w-1/5 text-right hidden lg:block'>
                  {format(new Date(referral.date_invited), "d MMMM, yyyy")}
                </p>
              </div>
            );
          })}
        </div>
      </div>
      <DisplayErrorMessages errors={errors} />
      {!!usersReferredRes && (
        <ServerPagination
          pagedResource={usersReferredRes}
          searchParams={resolvedSearchParams}
        />
      )}
    </>
  );
};

const WalletBalanceCard = ({
  balance = "0.00",
  currency = "USD",
  isReferralRewards = false,
  currentUser,
}: {
  balance?: string;
  currency?: string;
  isReferralRewards?: boolean;
  currentUser?: Talent;
}) => {
  return (
    <div className='w-full h-[202px] flex flex-col gap-1 justify-between font-poppins rounded-xl text-[#FEFEFF] p-6 bg-[conic-gradient(from_258.98deg_at_50%_50%,_#5465FF_0deg,_#323D99_246.04deg,_#5465FF_360deg)]'>
      <div className='flex items-center justify-between'>
        <h6 className='text-sm text-[15px] font-semibold'>Wallet Balance</h6>
        <InfoCircleIcon />
      </div>
      <div>
        <h3 className='justify-center flex items-center text-xs'>
          <span className='font-semibold text-3xl text-[32px] mr-0.5'>
            {balance}
          </span>
          {currency}
        </h3>
        <h5 className='text-center text-xs mt-1'>Available</h5>
      </div>
      {isReferralRewards ? (
        <WithdrawReferralRewards
          balance={Number(balance)}
          refresh
          accountNumber={currentUser?.account_number}
        />
      ) : (
        <button className='btn btn-sm h-10 hover:bg-white bg-white text-primary p-2 rounded-lg font-medium text-sm'>
          Withdraw
        </button>
      )}
    </div>
  );
};

const InfoCircleIcon = () => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    width='12'
    height='12'
    viewBox='0 0 12 12'
    fill='none'
  >
    <path
      d='M11 6C11 3.23857 8.7614 1 6 1C3.23857 1 1 3.23857 1 6C1 8.7614 3.23857 11 6 11C8.7614 11 11 8.7614 11 6Z'
      stroke='#FEFEFF'
    />
    <path
      d='M6.12109 8.5V6C6.12109 5.7643 6.12109 5.64645 6.04784 5.5732C5.97464 5.5 5.85679 5.5 5.62109 5.5'
      stroke='#FEFEFF'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
    <path
      d='M5.99609 4H6.00059'
      stroke='#FEFEFF'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
);
