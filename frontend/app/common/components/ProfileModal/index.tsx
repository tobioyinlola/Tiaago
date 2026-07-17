"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { cn } from "../../utils";
import Modal, { ModalProps } from "../Modal";
import { SimpleUser, User } from "../../types";
import { AvatarWithVerifiedBadge } from "../UserAvatar";
import ScheduleMeetingModal from "./ScheduleMeetingModal";
import { getTalentPortfolio } from "../../services/talents";
import WorkExperienceDisplay from "../WorkExperienceDisplay";
import { usePortfolioStore } from "../../store/useWorkExperiences";
import { IS_CHAT_HIDDEN } from "../../constants";

const colors = [
  {
    bg: "#F9F5FF",
    color: "#6941C6",
  },
  {
    bg: "#EFF8FF",
    color: "#175CD3",
  },
  {
    bg: "#EEF4FF",
    color: "#3538CD",
  },
  {
    bg: "#FDF2FA",
    color: "#C11574",
  },
];

const ProfileModal = ({
  online,
  user,
  modalRef,
  currentUserType,
  disableScheduleMeeting,
  portfolioSlug,
}: {
  user: User | SimpleUser;
  online?: boolean;
  modalRef: ModalProps["modalRef"];
  currentUserType: User["user_type"];
  disableScheduleMeeting?: boolean;
  portfolioSlug?: string;
}) => {
  const pathName = usePathname();
  const isUser = user && "country" in user;
  const userRole = isUser && user.user_type !== "ST" ? user.role : "";
  const { bg, color } = colors[Math.floor(Math.random() * colors.length)];
  const { portfolios, updatePortfolio } = usePortfolioStore();
  const [loadingWorkExperiences, setLoadingWorkExperiences] = useState(false);

  useEffect(() => {
    if (!user || user.user_type !== "T")
      return console.log("Error fetching user");

    if (user.user_type === "T") {
      const fetchWorkExperiences = async () => {
        setLoadingWorkExperiences(true);
        const res = await getTalentPortfolio(portfolioSlug || user.username);
        if (!res.success) {
          console.log("Error fetching work experiences: ", res.error);
          setLoadingWorkExperiences(false);
          return;
        }
        console.log("Work experiences fetched successfully: ", res.data);
        setLoadingWorkExperiences(false);
        const data = res.data!;
        updatePortfolio(data, user.id);
      };
      fetchWorkExperiences();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id, user.user_type, portfolioSlug]);

  // console.log('user', user)

  const portfolioData = portfolios[user.id] ?? {};
  const experiences = portfolioData.experience ?? [];
  const userBio = isUser
    ? user.bio || portfolioData.about
    : portfolioData.about;

  return (
    <Modal
      modalRef={modalRef}
      id='profile-modal'
      disablePadding
      disableBorderRadius
      className='ml-auto rounded-none md:mr-10'
    >
      <Image
        src='/assets/images/profile-bg.png'
        alt='wallpaper'
        width={400}
        height={120}
      />
      <div className='px-6 w-[400px] pb-10'>
        <AvatarWithVerifiedBadge
          firstName={user.first_name}
          lastName={user.last_name}
          verified={user.verified}
          profilePic={user.profile_pic}
          className='w-24 text-3xl bg-gray-400'
          containerClass='border-4 border-white rounded-full -mt-[52px]'
          size={24}
        />
        <div className='flex items-center gap-2 mt-6'>
          <h3 className='text-2xl font-medium text-gray-900'>
            {`${user.first_name || ""} ${user.last_name || ""}`.trim()}
          </h3>
          <div
            className={cn(
              "w-3 h-3 bg-[#12B76A] rounded-full",
              !online && "bg-gray-400"
            )}
          />
        </div>
        <p className='text-gray-500 text-base'>{user.email}</p>
        <div className='mt-4 flex items-center gap-2 justify-between flex-wrap'>
          {userRole && (
            <div
              className='badge text-xs font-medium capitalize'
              style={{
                backgroundColor: bg,
                color,
              }}
            >
              {userRole}
            </div>
          )}
          {user.user_type === "T" && (
            <Link
              href={`/talents/${portfolioSlug || user.username}/portfolio`}
              className='btn btn-link btn-primary font-medium'
              target='_blank'
            >
              View Portfolio
            </Link>
          )}
        </div>
        {currentUserType === "CR" && (
          <div className='flex items-center gap-3 mt-4 flex-wrap'>
            {!pathName.includes("messages") && isUser && (
              <Link
                href={{
                  pathname: "/recruiter/dashboard/messages",
                  query: { user: user.id },
                }}
                className={cn(
                  "btn btn-outline font-medium border-gray-300 shadow-sm text-gray-700",
                  IS_CHAT_HIDDEN && "hidden"
                )}
              >
                Message Talent
              </Link>
            )}
            <ScheduleMeetingModal
              talentID={user.id}
              name={`${user.first_name ?? ""} ${user.last_name ?? ""}`.trim()}
              disableScheduleMeeting={disableScheduleMeeting}
            />
          </div>
        )}
        <article className='my-6 text-sm mt-4' id='about'>
          <h5 className='text-gray-700 font-medium'>About</h5>
          <div
            className='text-gray-500'
            dangerouslySetInnerHTML={{
              __html: userBio ?? "Bio not added yet",
            }}
          />
        </article>
        {user.user_type === "T" && (
          <>
            <h5 className='text-sm text-gray-700 font-medium mt-4'>
              Work experience
            </h5>
            {experiences.map((we, i) => (
              <WorkExperienceDisplay experience={we} key={i} className='mt-4' />
            ))}
            {loadingWorkExperiences && (
              <div className='flex items-center justify-center mt-4'>
                <div className='w-4 h-4 border-2 border-t-primary rounded-full animate-spin' />
              </div>
            )}
            {!loadingWorkExperiences && !experiences.length && (
              <p className='text-gray-500 text-sm mt-4'>
                No work experience available
              </p>
            )}
          </>
        )}
      </div>
    </Modal>
  );
};

export default ProfileModal;
