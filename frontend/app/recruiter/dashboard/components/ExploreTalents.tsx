"use client";

import ReactSelect from "react-select";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { FiSearch } from "react-icons/fi";

import { ISearchParams, PagedResource, Talent, TalentRole } from "@/app/common/types";
import TalentCard, { FindTalentCard } from "./TalentCard";
import { toggleCreateContractModal } from "@/app/common/utils";
import ProfileModal from "@/app/common/components/ProfileModal";
import EmptyState from "@/app/common/components/dashboard/EmptyState";
import CreateContractModal from "@/app/common/components/CreateContractModal";
import CarouselControls from "@/app/common/components/Carousel/CarouselControls";
import { experienceLevelOptions } from "@/app/talents/signup/constants/form.contants";
import ServerPagination from "@/app/common/components/ServerPagination";

const ExploreTalents = ({
  talents,
  disableScheduleMeeting,
}: {
  talents: Talent[];
  disableScheduleMeeting: boolean;
}) => {
  const profileModalRef = useRef<HTMLDialogElement>(null);
  const [activeTalent, setActivetalent] = useState(talents[0]);
  const onViewProfile = (talent: Talent) => {
    setActivetalent(talent);
    profileModalRef.current?.showModal();
  };
  return (
    <div className='pb-8 dashboard-content-constraint'>
      <div className='flex items-center justify-between'>
        <h3 className='text-gray-900 text-lg font-medium'>
          Explore Our Talents
        </h3>
        <CarouselControls id='talents-carousel' distance={300} />
      </div>
      <div className='carousel space-x-4 mt-5 w-full' id='talents-carousel'>
        {talents.map(talent => {
          return (
            <div
              key={talent.pk ?? talent.id}
              className='carousel-item min-w-72 max-w-[300px] w-full'
            >
              <TalentCard talent={talent} onViewProfile={onViewProfile} />
            </div>
          );
        })}
      </div>
      {!talents.length && <EmptyState text='No talents found' />}
      {!!activeTalent && (
        <ProfileModal
          modalRef={profileModalRef}
          currentUserType='CR'
          user={activeTalent}
          disableScheduleMeeting={disableScheduleMeeting}
        />
      )}
    </div>
  );
};

export const FindTalents = ({
  talentsRes,
  roles,
  disableScheduleMeeting,
  searchParams = {},
}: {
  talentsRes: PagedResource<Talent> | null;
  roles: TalentRole[];
  disableScheduleMeeting: boolean;
  searchParams?: ISearchParams;
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const profileModalRef = useRef<HTMLDialogElement>(null);

  const talents = talentsRes?.results || [];

  const initialSearch =
    typeof searchParams.search === "string" ? searchParams.search : "";
  const initialRole = typeof searchParams.role === "string" ? searchParams.role : "";
  const initialExperienceLevel =
    typeof searchParams.experience_level === "string"
      ? searchParams.experience_level
      : "";

  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [selectedRole, setSelectedRole] = useState(initialRole);
  const [selectedExperienceLevel, setSelectedExperienceLevel] =
    useState(initialExperienceLevel);
  const [activeTalent, setActivetalent] = useState(talents[0]);

  const showContractModal = (talent: Talent) => {
    setActivetalent(talent);
    toggleCreateContractModal();
  };
  const onViewProfile = (talent: Talent) => {
    setActivetalent(talent);
    profileModalRef.current?.showModal();
  };

  const pushFilters = (next: {
    search?: string;
    role?: string;
    experience_level?: string;
  }) => {
    const params = new URLSearchParams();
    const search = next.search ?? searchTerm;
    const role = next.role ?? selectedRole;
    const experienceLevel = next.experience_level ?? selectedExperienceLevel;
    if (search) params.set("search", search);
    if (role) params.set("role", role);
    if (experienceLevel) params.set("experience_level", experienceLevel);
    router.push(`${pathname}?${params.toString()}`);
  };

  useEffect(() => {
    if (searchTerm === initialSearch) return;
    const timeout = setTimeout(() => pushFilters({ search: searchTerm }), 500);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const onSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };
  const onSelectedRole = (role: string) => {
    setSelectedRole(role);
    pushFilters({ role });
  };
  const onSelectedExperienceLevel = (experienceLevel: string) => {
    setSelectedExperienceLevel(experienceLevel);
    pushFilters({ experience_level: experienceLevel });
  };

  return (
    <div className='pb-8 mt-2'>
      <div className='w-full pl-6 pr-2 py-[14px] bg-[#D9DDFF] mb-8 flex max-md:flex-col md:items-center gap-1 justify-between'>
        <div className='relative'>
          <FiSearch
            className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xl'
            aria-hidden
          />
          <input
            placeholder='Search...'
            className='input input-bordered pl-10 w-full text-xs'
            value={searchTerm}
            onChange={onSearch}
          />
        </div>
        <div className='border-l flex items-center gap-1 max-md:flex-col'>
          <ReactSelect
            options={roles.map(role => ({
              value: role.title,
              label: role.title,
            }))}
            placeholder='Role'
            className='min-w-[180px] max-md:w-full'
            isClearable
            onChange={option => onSelectedRole(option?.value ?? "")}
          />
          <ReactSelect
            options={experienceLevelOptions
              .map(option => option.value)
              .sort()
              .map(value => ({
                value,
                label: value,
              }))}
            className='min-w-[180px] max-md:w-full'
            placeholder='Experience Level'
            isClearable
            onChange={option => onSelectedExperienceLevel(option?.value ?? "")}
          />
        </div>
      </div>
      <div className='flex flex-col gap-6'>
        {talents.map(talent => (
          <FindTalentCard
            key={talent.pk ?? talent.id}
            talent={talent}
            showContractModal={showContractModal}
            onViewProfile={onViewProfile}
          />
        ))}
      </div>
      {!talents.length && (
        <EmptyState
          text={
            searchTerm || selectedRole || selectedExperienceLevel
              ? "No talents found for the search term"
              : "No talents found"
          }
        />
      )}
      {talentsRes && (
        <div className='my-8'>
          <ServerPagination pagedResource={talentsRes} searchParams={searchParams} />
        </div>
      )}
      <CreateContractModal
        talentID={activeTalent?.id ?? activeTalent?.pk ?? 0}
        name={`${activeTalent?.first_name} ${activeTalent?.last_name}`}
        buttonClassName='hidden'
        roles={roles}
        defaultRole={
          roles.find(
            role =>
              role?.title?.toLowerCase() === activeTalent?.role?.toLowerCase()
          )?.id
        }
      />
      {!!activeTalent && (
        <ProfileModal
          modalRef={profileModalRef}
          currentUserType='CR'
          user={activeTalent}
          disableScheduleMeeting={disableScheduleMeeting}
        />
      )}
    </div>
  );
};

export default ExploreTalents;
