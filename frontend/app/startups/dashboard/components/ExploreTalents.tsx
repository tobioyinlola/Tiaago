"use client";

import ReactSelect from "react-select";
import { useRef, useState } from "react";
import { FiSearch } from "react-icons/fi";

import { Talent, TalentRole } from "@/app/common/types";
import TalentCard, { FindTalentCard } from "./TalentCard";
import { toggleCreateContractModal } from "@/app/common/utils";
import ProfileModal from "@/app/common/components/ProfileModal";
import EmptyState from "@/app/common/components/dashboard/EmptyState";
import CreateContractModal from "@/app/common/components/CreateContractModal";
import CarouselControls from "@/app/common/components/Carousel/CarouselControls";
import { experienceLevelOptions } from "@/app/talents/signup/constants/form.contants";

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
  talents,
  roles,
  disableScheduleMeeting,
}: {
  talents: Talent[];
  roles: TalentRole[];
  disableScheduleMeeting: boolean;
}) => {
  const profileModalRef = useRef<HTMLDialogElement>(null);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedExperienceLevel, setSelectedExperienceLevel] = useState("");
  const [activeTalent, setActivetalent] = useState(talents[0]);
  const [filteredTalents, setFilteredTalents] = useState(talents);

  const nextPage = () => setPage(prev => prev + 1);
  const prevPage = () => setPage(prev => prev - 1);
  const showContractModal = (talent: Talent) => {
    setActivetalent(talent);
    toggleCreateContractModal();
  };
  const onViewProfile = (talent: Talent) => {
    setActivetalent(talent);
    profileModalRef.current?.showModal();
  };

  const onSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const search = e.target.value;
    setSearchTerm(search);
    applyFilters({
      search,
    });
  };
  const onSelectedRole = (role: string) => {
    setSelectedRole(role);
    applyFilters({
      role,
    });
  };
  const onSelectedExperienceLevel = (experienceLevel: string) => {
    setSelectedExperienceLevel(experienceLevel);
    applyFilters({
      experienceLevel,
    });
  };

  const applyFilters = ({
    search = searchTerm,
    role = selectedRole,
    experienceLevel = selectedExperienceLevel,
  }) => {
    let filtered = talents;
    if (search) {
      const value = search.toLowerCase();
      filtered = filtered.filter(
        talent =>
          talent.first_name?.toLowerCase().includes(value) ||
          talent.last_name?.toLowerCase().includes(value) ||
          talent.country?.toLowerCase().includes(value) ||
          talent.experience_level?.toLowerCase().includes(value) ||
          talent.role?.toLowerCase().includes(value)
      );
    }
    if (role) {
      filtered = filtered.filter(
        talent => talent.role.toLowerCase() === role.toLowerCase()
      );
    }
    if (experienceLevel) {
      filtered = filtered.filter(
        talent =>
          talent.experience_level.toLowerCase() ===
          experienceLevel.toLowerCase()
      );
    }
    setFilteredTalents(filtered);
  };

  const pagedData = filteredTalents.slice((page - 1) * 10, page * 10);

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
        {pagedData.map(talent => (
          <FindTalentCard
            key={talent.pk ?? talent.id}
            talent={talent}
            showContractModal={showContractModal}
            onViewProfile={onViewProfile}
          />
        ))}
      </div>
      {!pagedData.length && (
        <EmptyState
          text={
            talents.length
              ? "No talents found for the search term"
              : "No talents found"
          }
        />
      )}
      {filteredTalents.length > 10 && (
        <div className='join my-8 mx-auto'>
          <button
            className='join-item btn'
            onClick={prevPage}
            disabled={page === 1}
          >
            «
          </button>
          <button className='join-item btn'>Page {page}</button>
          <button
            className='join-item btn'
            onClick={nextPage}
            disabled={page * 10 >= filteredTalents.length}
          >
            »
          </button>
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
