"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { VettedCandidateCard } from "./VettedCandidateCard";
import { Input } from "@/app/common/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/common/components/ui/select";
import { Search, Users } from "lucide-react";
import { ISearchParams, PagedResource, Talent, TalentRole } from "@/app/common/types";
import CreateContractModal from "@/app/common/components/CreateContractModal";
import ProfileModal from "@/app/common/components/ProfileModal";
import { toggleCreateContractModal } from "@/app/common/utils";
import { experienceLevelOptions } from "@/app/talents/signup/constants/form.contants";
import ServerPagination from "@/app/common/components/ServerPagination";

interface VettedTalentsTabProps {
  talentsRes: PagedResource<Talent> | null;
  roles: TalentRole[];
  searchParams?: ISearchParams;
}

export function VettedTalentsTab({
  talentsRes,
  roles,
  searchParams = {},
}: VettedTalentsTabProps) {
  const router = useRouter();
  const pathname = usePathname();

  const vettedCandidates = talentsRes?.results || [];

  const initialSearch =
    typeof searchParams.search === "string" ? searchParams.search : "";
  const initialRole = typeof searchParams.role === "string" ? searchParams.role : "all";
  const initialExperience =
    typeof searchParams.experience_level === "string"
      ? searchParams.experience_level
      : "all";

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedRole, setSelectedRole] = useState(initialRole);
  const [selectedExperience, setSelectedExperience] = useState(initialExperience);
  const [activeTalent, setActivetalent] = useState(vettedCandidates[0]);

  const profileModalRef = useRef<HTMLDialogElement>(null);

  const pushFilters = (next: {
    search?: string;
    role?: string;
    experience_level?: string;
  }) => {
    const params = new URLSearchParams();
    const search = next.search ?? searchQuery;
    const role = next.role ?? selectedRole;
    const experienceLevel = next.experience_level ?? selectedExperience;
    if (search) params.set("search", search);
    if (role && role !== "all") params.set("role", role);
    if (experienceLevel && experienceLevel !== "all")
      params.set("experience_level", experienceLevel);
    router.push(`${pathname}?${params.toString()}`);
  };

  useEffect(() => {
    if (searchQuery === initialSearch) return;
    const timeout = setTimeout(() => pushFilters({ search: searchQuery }), 500);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const handleRoleChange = (value: string) => {
    setSelectedRole(value);
    pushFilters({ role: value });
  };

  const handleExperienceChange = (value: string) => {
    setSelectedExperience(value);
    pushFilters({ experience_level: value });
  };

  const handleCreateContract = (candidate: Talent) => {
    setActivetalent(candidate);
    toggleCreateContractModal();
  };

  const onViewProfile = (talent: Talent) => {
    setActivetalent(talent);
    profileModalRef.current?.showModal();
  };

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div>
        <h1 className='text-2xl font-bold text-foreground'>Find Talents</h1>
        <p className='text-muted-foreground'>
          Discover talents that can help you grow your business
        </p>
      </div>

      {/* Filter Bar */}
      <div className='flex flex-col gap-4 rounded-xl bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between'>
        <div className='relative flex-1 max-w-xs'>
          <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
          <Input
            placeholder='Search...'
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className='pl-9 bg-background'
          />
        </div>

        <div className='flex flex-wrap gap-3'>
          <Select value={selectedRole} onValueChange={handleRoleChange}>
            <SelectTrigger className='w-40 bg-background'>
              <SelectValue placeholder='Role' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All Roles</SelectItem>
              {roles.map(role => (
                <SelectItem key={role.id} value={role.title}>
                  {role.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedExperience} onValueChange={handleExperienceChange}>
            <SelectTrigger className='w-44 bg-background'>
              <SelectValue placeholder='Experience Level' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All Levels</SelectItem>
              {experienceLevelOptions.map(level => (
                <SelectItem key={level.value} value={level.value}>
                  {level.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results */}
      {vettedCandidates.length > 0 ? (
        <div className='space-y-4'>
          {vettedCandidates.map(candidate => (
            <VettedCandidateCard
              key={candidate.id}
              candidate={candidate}
              onViewProfile={onViewProfile}
              onCreateContract={handleCreateContract}
            />
          ))}
        </div>
      ) : (
        <div className='flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border py-20 text-center'>
          <div className='rounded-2xl bg-muted p-5 mb-4'>
            <Users className='h-10 w-10 text-muted-foreground' />
          </div>
          <h3 className='text-xl font-semibold text-foreground'>
            No talents found
          </h3>
          <p className='mt-2 max-w-sm text-muted-foreground'>
            Try adjusting your filters or search query
          </p>
        </div>
      )}

      {talentsRes && (
        <ServerPagination pagedResource={talentsRes} searchParams={searchParams} />
      )}

      {/* Modals */}
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
        />
      )}
    </div>
  );
}
