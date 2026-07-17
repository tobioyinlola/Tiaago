"use client";
import { Card } from "@/app/common/components/ui/card";
import { Button } from "@/app/common/components/ui/button";
import { Badge } from "@/app/common/components/ui/badge";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/app/common/components/ui/avatar";
import { BadgeCheck } from "lucide-react";
import { Talent } from "@/app/common/types";

interface VettedCandidateCardProps {
  candidate: Talent;
  onViewProfile: (candidate: Talent) => void;
  onCreateContract?: (candidate: Talent) => void;
}

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

export function VettedCandidateCard({
  candidate,
  onViewProfile,
  onCreateContract,
}: VettedCandidateCardProps) {
  const name = [candidate.first_name, candidate.last_name]
    .filter(Boolean)
    .join(" ");
  const portfolioPreview = (candidate as any)?.talent_portfolio_preview;
  const verifiedSkillsets: string[] =
    portfolioPreview?.verified_skillsets ?? [];
  return (
    <Card className='overflow-hidden transition-all hover:shadow-lg p-5'>
      <div className='flex items-start gap-4'>
        {/* Avatar Section */}
        <div className='relative shrink-0'>
          <Avatar className='h-16 w-16'>
            <AvatarImage src={candidate.profile_pic} alt={name} />
            <AvatarFallback className='bg-muted text-lg font-semibold text-muted-foreground'>
              {getInitials(name)}
            </AvatarFallback>
          </Avatar>
          <div className='absolute -bottom-1 -right-1'>
            <div className='flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground'>
              <BadgeCheck className='h-3.5 w-3.5' />
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className='flex-1 min-w-0'>
          <div className='flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3'>
            <div className='flex-1 min-w-0'>
              <p className='text-sm text-muted-foreground capitalize'>
                {candidate.role}
              </p>
              <h3 className='text-lg font-semibold text-foreground'>{name}</h3>

              {candidate.bio && (
                <p
                  className='mt-1.5 text-sm text-muted-foreground line-clamp-2'
                  dangerouslySetInnerHTML={{ __html: candidate.bio }}
                />
              )}

              <div className='mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm'>
                <span className='text-muted-foreground'>
                  <span className='font-medium text-foreground'>Location:</span>{" "}
                  {candidate.country}
                </span>
              </div>

              <div className='mt-2 flex flex-wrap items-center gap-2'>
                <span className='text-sm font-medium text-foreground'>
                  Verified Skillsets:
                </span>
                {verifiedSkillsets.slice(0, 3).map(skill => (
                  <Badge
                    key={skill}
                    variant='outline'
                    className='border-primary/30 bg-primary/5 text-primary text-xs'
                  >
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>

            <div className='flex flex-wrap gap-2 sm:flex-col sm:shrink-0'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => onCreateContract?.(candidate)}
              >
                Create Contract
              </Button>
              <Button size='sm' onClick={() => onViewProfile(candidate)}>
                View Profile
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
