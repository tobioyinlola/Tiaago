import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Globe, CheckCircle2, Sparkles, Users } from "lucide-react";

import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import ScrollArea from "@/app/common/components/ScrollArea";
import { getPublicCompanyProfile } from "@/app/common/services/profile";
import { htmlToPlainText, handleServerApiCallError } from "@/app/common/utils";
import PublicCompanyProfileJobList from "./_components/PublicCompanyProfileJobList";

export async function generateMetadata({
  params,
}: PublicCompanyPageProps): Promise<Metadata> {
  const { id } = await params;
  const profile = await getPublicCompanyProfile(id).catch(() => null);
  if (!profile)
    return { title: "Company Profile" };
  const title = `${profile.company_name} - Careers`;
  const description = profile.bio
    ? profile.bio.slice(0, 160)
    : `Explore career opportunities at ${profile.company_name} on TIAAGO.`;
  return {
    title,
    description,
    openGraph: { title, description, siteName: "TIAAGO", type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

interface PublicCompanyPageProps {
  params: Promise<{ id: string }>;
}

const PublicCompanyPage = async ({ params }: PublicCompanyPageProps) => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const { id } = await params;
  const companyProfile = await getPublicCompanyProfile(id).catch(async e => {
    const error = await handleServerApiCallError(e);
    console.log("Get public company profile error (company page): ", error);
    errors.push({
      message: error,
      title: "Error getting public company profile",
    });
    return null;
  });
  if (!companyProfile) notFound();
  const jobs = companyProfile.jobs || [];
  const backupProfile = jobs.at(0)?.company;
  const website = companyProfile.website || backupProfile?.website;
  const bio = companyProfile.bio || jobs.at(0)?.about_company;

  return (
    <ScrollArea className='h-[100svh] w-[100svw] bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50'>
      <DisplayErrorMessages errors={errors} />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMwMDAiIGZpbGwtb3BhY2l0eT0iMC4wMiI+PHBhdGggZD0iTTM2IDM0djItaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bS0yLTJ2Mmgydi0yaC0yem0tMiAwdjJoMnYtMmgtMnptLTIgMHYyaDJ2LTJoLTJ6bS0yIDB2Mmgydi0yaC0yem0tMiAydjJoMnYtMmgtMnptLTIgMHYyaDJ2LTJoLTJ6bS0yIDB2Mmgydi0yaC0yem0tMiAwdjJoMnYtMmgtMnptLTIgMnYyaDJ2LTJoLTJ6bS0yIDB2Mmgydi0yaC0yem0tMiAwdjJoMnYtMmgtMnptLTIgMHYyaDJ2LTJoLTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-40"></div>

      <div className='relative'>
        <nav className='bg-white/80 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-50'>
          <div className='max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2 sm:gap-3'>
                <div className='w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br relative from-blue-600 via-blue-700 to-blue-800 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg'>
                  {companyProfile.profile_pic ? (
                    <Image
                      src={companyProfile.profile_pic}
                      alt={companyProfile.company_name}
                      fill
                      className='object-cover rounded-lg sm:rounded-xl'
                    />
                  ) : (
                    <Users size={20} className='text-white sm:w-6 sm:h-6' />
                  )}
                </div>
                <div>
                  <h1 className='text-base sm:text-xl font-bold text-gray-900'>
                    {companyProfile.company_name}
                  </h1>
                  <p className='text-xs text-gray-600'>Career Opportunities</p>
                </div>
              </div>
              {!!website && (
                <a
                  href={website}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors'
                >
                  <Globe size={14} className='sm:w-4 sm:h-4' />
                  <span className='hidden sm:inline'>Visit Website</span>
                </a>
              )}
            </div>
          </div>
        </nav>

        <div className='relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900'>
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMDUiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-30"></div>
          <div className='relative max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-24'>
            <div className='max-w-3xl'>
              <div className='inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-white/10 backdrop-blur-sm rounded-full mb-4 sm:mb-6'>
                <Sparkles size={14} className='text-blue-200 sm:w-4 sm:h-4' />
                <span className='text-xs sm:text-sm font-medium text-white'>
                  Curated Opportunities
                </span>
              </div>
              <h2 className='text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-poppins font-bold text-white mb-4 sm:mb-6 leading-tight'>
                Discover Your Next Career Move
              </h2>
              <p className='text-base sm:text-lg md:text-xl text-blue-100 mb-6 sm:mb-8 leading-relaxed'>
                {htmlToPlainText(bio || "")}
              </p>
              <div className='flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-3 sm:gap-4'>
                <div className='flex items-center gap-2 text-white/90'>
                  <CheckCircle2
                    size={18}
                    className='text-blue-300 flex-shrink-0 sm:w-5 sm:h-5'
                  />
                  <span className='text-sm sm:text-base font-medium'>
                    {jobs.length} Premium Opportunities
                  </span>
                </div>
                <div className='flex items-center gap-2 text-white/90'>
                  <CheckCircle2
                    size={18}
                    className='text-blue-300 flex-shrink-0 sm:w-5 sm:h-5'
                  />
                  <span className='text-sm sm:text-base font-medium'>
                    Top Companies
                  </span>
                </div>
                <div className='flex items-center gap-2 text-white/90'>
                  <CheckCircle2
                    size={18}
                    className='text-blue-300 flex-shrink-0 sm:w-5 sm:h-5'
                  />
                  <span className='text-sm sm:text-base font-medium'>
                    Competitive Packages
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className='absolute bottom-0 left-0 right-0 h-16 sm:h-24 bg-gradient-to-t from-slate-50 to-transparent'></div>
        </div>

        <PublicCompanyProfileJobList jobs={jobs} />

        <footer className='bg-white border-t border-gray-200 mt-12 sm:mt-20'>
          <div className='max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12'>
            <div className='flex flex-col md:flex-row items-center justify-between gap-6'>
              <div />
              <div className='text-center md:text-right'>
                <p className='text-xs sm:text-sm text-gray-600 mb-1'>
                  Powered by{" "}
                  <Link
                    href='https://tiaago.com'
                    target='_blank'
                    className='font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent'
                  >
                    Tiaago Technologies
                  </Link>
                </p>
                <p className='text-xs text-gray-500'>
                  World-class recruiting platform
                </p>
              </div>
            </div>
          </div>
        </footer>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </ScrollArea>
  );
};

export default PublicCompanyPage;
