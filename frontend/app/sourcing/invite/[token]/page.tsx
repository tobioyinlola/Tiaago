import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { validateInviteToken } from "@/app/common/services/sourcing";
import { InviteApplicationForm } from "./_components/InviteApplicationForm";
import { getCurrentUser } from "@/app/common/services/profile";
import { useUserStore } from "@/app/common/store/useUser";
import SetUserProfile from "@/app/common/components/Layout/SetUserProfile";
import { getTalentRoles, getCountries } from "@/app/common/services";

type Props = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const result = await validateInviteToken(token);
  if (result.success && result.data.is_active) {
    return {
      title: `Join ${result.data.company_name}'s Talent Network | TIAAGO`,
      description: `You've been invited to join ${result.data.company_name}'s ${result.data.category_name} talent community.`,
    };
  }
  return { title: "Talent Network Invite | TIAAGO" };
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params;
  const result = await validateInviteToken(token);
  const { currentUser, removeAuthCookies } = await getCurrentUser(undefined, {
    allowNull: true,
  });
  useUserStore.setState({ profile: currentUser });

  if (!result.success) {
    return (
      <>
        <SetUserProfile
          profile={currentUser}
          removeAuthCookies={removeAuthCookies}
        />
        <div className='h-[100svh] w-[100svw] bg-white relative overflow-hidden'>
          <Image
            src='/assets/images/Pricing Background pattern.png'
            alt='Background pattern'
            className='object-cover'
            fill
          />
          <div className='relative flex items-center justify-center h-full px-4'>
            <div className='max-w-md w-full text-center space-y-4'>
              <div className='mx-auto w-16 h-16 rounded-full bg-error/10 flex items-center justify-center'>
                <svg
                  className='h-8 w-8 text-error'
                  fill='none'
                  viewBox='0 0 24 24'
                  strokeWidth={1.5}
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    d='M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z'
                  />
                </svg>
              </div>
              <h1 className='text-2xl font-semibold font-onest text-black'>
                Invalid Invite Link
              </h1>
              <p className='text-[#5F6264] text-sm font-onest'>
                This invite link is not valid. It may have been revoked or the
                URL is incorrect. Please contact the recruiter who shared this
                link with you.
              </p>
              <Link
                href='/'
                className='btn btn-primary text-white w-full mt-4'
              >
                Go Home
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!result.data.is_active) {
    return (
      <>
        <SetUserProfile
          profile={currentUser}
          removeAuthCookies={removeAuthCookies}
        />
        <div className='h-[100svh] w-[100svw] bg-white relative overflow-hidden'>
          <Image
            src='/assets/images/Pricing Background pattern.png'
            alt='Background pattern'
            className='object-cover'
            fill
          />
          <div className='relative flex items-center justify-center h-full px-4'>
            <div className='max-w-md w-full text-center space-y-4'>
              <div className='mx-auto w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center'>
                <svg
                  className='h-8 w-8 text-warning'
                  fill='none'
                  viewBox='0 0 24 24'
                  strokeWidth={1.5}
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    d='M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z'
                  />
                </svg>
              </div>
              <h1 className='text-2xl font-semibold font-onest text-black'>
                Invite Expired
              </h1>
              <p className='text-[#5F6264] text-sm font-onest'>
                This invite link is no longer active. The talent pool may have
                been closed or the invite was deactivated. Please reach out to
                the recruiting team for a new link.
              </p>
              <Link
                href='/'
                className='btn btn-primary text-white w-full mt-4'
              >
                Go Home
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SetUserProfile
        profile={currentUser}
        removeAuthCookies={removeAuthCookies}
      />
      <InviteApplicationForm
        token={token}
        categoryName={result.data.category_name}
        companyName={result.data.company_name}
        talentRoles={await getTalentRoles().catch(() => [])}
        groupedCountries={await getCountries().catch(() => [])}
      />
    </>
  );
}
