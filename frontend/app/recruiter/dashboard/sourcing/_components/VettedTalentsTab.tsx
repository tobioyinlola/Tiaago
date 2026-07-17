"use client";
import { useState, useMemo, useRef } from "react";
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
import { Talent, TalentRole } from "@/app/common/types";
import { toast } from "sonner";
import CreateContractModal from "@/app/common/components/CreateContractModal";
import ProfileModal from "@/app/common/components/ProfileModal";
import { toggleCreateContractModal } from "@/app/common/utils";
import { experienceLevelOptions } from "@/app/talents/signup/constants/form.contants";

interface VettedTalentsTabProps {
  talents: Talent[];
  roles: TalentRole[];
}

export function VettedTalentsTab({
  talents: vettedCandidates,
  roles,
}: VettedTalentsTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [selectedExperience, setSelectedExperience] = useState<string>("all");
  const [activeTalent, setActivetalent] = useState(vettedCandidates[0]);

  const profileModalRef = useRef<HTMLDialogElement>(null);

  const filteredCandidates = useMemo(() => {
    return vettedCandidates.filter(candidate => {
      const matchesSearch =
        searchQuery === "" ||
        candidate.first_name
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        candidate.last_name
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        candidate.country?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRole =
        selectedRole === "all" ||
        candidate.role.toLowerCase() === selectedRole.toLowerCase();

      const matchesExperience =
        selectedExperience === "all" ||
        candidate.experience_level
          .toLowerCase()
          .includes(selectedExperience.toLowerCase());

      return matchesSearch && matchesRole && matchesExperience;
    });
  }, [searchQuery, selectedRole, selectedExperience, vettedCandidates]);

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
          <Select value={selectedRole} onValueChange={setSelectedRole}>
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

          <Select
            value={selectedExperience}
            onValueChange={setSelectedExperience}
          >
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
      {filteredCandidates.length > 0 ? (
        <div className='space-y-4'>
          {filteredCandidates.map(candidate => (
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
