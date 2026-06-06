"use client";
import { Card, CardContent } from "@/app/common/components/ui/card";
import { Badge } from "@/app/common/components/ui/badge";
import { Checkbox } from "@/app/common/components/ui/checkbox";
import {
  Mail,
  Phone,
  MapPin,
  MoreHorizontal,
  Eye,
  UserPlus,
  Linkedin,
  Briefcase,
  Star,
  Building,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/app/common/components/ui/dropdown-menu";
import { cn } from "@/app/common/lib/utils";
import { Candidate, ServerCandidate } from "@/app/common/types";
import { Button } from "@/app/common/components/ui/button";

interface CandidateCardProps {
  candidate: ServerCandidate;
  isSelected: boolean;
  onSelect: () => void;
  onViewProfile: (candidate: ServerCandidate) => void;
  onAddToPipeline?: (candidate: ServerCandidate) => void;
}

function getScoreColor(score: number) {
  if (score >= 85) return "text-score-high";
  if (score >= 70) return "text-score-medium";
  return "text-score-low";
}

function getScoreBg(score: number) {
  if (score >= 85) return "bg-score-high/10";
  if (score >= 70) return "bg-score-medium/10";
  return "bg-score-low/10";
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase();
}

export function CandidateCard({
  candidate,
  isSelected,
  onSelect,
  onViewProfile,
  onAddToPipeline,
}: CandidateCardProps) {
  return (
    <Card
      className={cn(
        "group relative overflow-hidden transition-all duration-300 hover:shadow-card-hover animate-fade-in cursor-pointer",
        isSelected && "ring-2 ring-primary shadow-card-hover"
      )}
      onClick={() => onViewProfile(candidate)}
    >
      {/* Selection indicator */}
      {/* <div
        className={cn(
          "absolute left-0 top-0 h-full w-1 transition-all",
          isSelected ? "bg-primary" : "bg-transparent group-hover:bg-primary/30"
        )}
      /> */}

      <CardContent className='p-0'>
        {/* Top Section with gradient background */}
        <div className='relative bg-gradient-to-r from-primary/5 via-transparent to-primary/5 px-5 pt-5 pb-4'>
          {/* Checkbox & Actions Row */}
          <div className='flex items-start justify-between mb-4'>
            <div
              onClick={e => {
                e.stopPropagation();
                onSelect();
              }}
              className='cursor-pointer'
            >
              <Checkbox
                checked={isSelected}
                className='h-5 w-5 data-[state=checked]:bg-primary data-[state=checked]:border-primary'
              />
            </div>

            <div className='flex items-center gap-2'>
              {/* Match Score Badge */}
              {/* <div
                className={cn(
                  "flex items-center gap-1 rounded-full px-2.5 py-1",
                  getScoreBg(candidate.overallScore)
                )}
              >
                <Star
                  className={cn(
                    "h-3.5 w-3.5",
                    getScoreColor(candidate.overallScore)
                  )}
                />
                <span
                  className={cn(
                    "text-sm font-bold",
                    getScoreColor(candidate.overallScore)
                  )}
                >
                  {candidate.overallScore}%
                </span>
              </div> */}

              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                  <Button variant='ghost' size='icon' className='h-8 w-8'>
                    <MoreHorizontal className='h-4 w-4' />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end'>
                  <DropdownMenuItem
                    onClick={e => {
                      e.stopPropagation();
                      onViewProfile(candidate);
                    }}
                  >
                    <Eye className='mr-2 h-4 w-4' />
                    View Profile
                  </DropdownMenuItem>
                  {onAddToPipeline && (
                    <DropdownMenuItem
                      onClick={e => {
                        e.stopPropagation();
                        onAddToPipeline(candidate);
                      }}
                    >
                      <UserPlus className='mr-2 h-4 w-4' />
                      Add to Pipeline
                    </DropdownMenuItem>
                  )}
                  {candidate.linkdIn_profile && (
                    <DropdownMenuItem asChild>
                      <a
                        href={`https://${candidate.linkdIn_profile}`}
                        target='_blank'
                        rel='noopener noreferrer'
                        onClick={e => e.stopPropagation()}
                      >
                        <Linkedin className='mr-2 h-4 w-4' />
                        View LinkedIn
                      </a>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Initials Avatar & Basic Info */}
          <div className='flex items-start gap-4'>
            <div className='h-14 w-14 rounded-full bg-primary flex items-center justify-center ring-2 ring-background shadow-soft shrink-0'>
              <span className='text-lg font-bold text-primary-foreground'>
                {getInitials(candidate.name)}
              </span>
            </div>

            <div className='flex-1 min-w-0'>
              <h3 className='font-semibold text-foreground truncate group-hover:text-primary transition-colors capitalize'>
                {candidate.name}
              </h3>
              <p className='text-sm text-muted-foreground truncate capitalize'>
                {candidate.role}
              </p>

              <div className='flex items-center gap-3 mt-2 text-xs text-muted-foreground'>
                <span className='flex items-center gap-1 capitalize'>
                  <MapPin className='h-3 w-3' />
                  {candidate.country}
                </span>
                <span className='flex items-center gap-1'>
                  <Briefcase className='h-3 w-3' />
                  {candidate.years_of_expr} years
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Middle Section - Current Company */}
        {!!candidate.current_company && (
          <div className='px-5 py-3 border-y border-border bg-muted/30'>
            <div className='flex items-center gap-2 text-sm'>
              <Building className='h-4 w-4 text-muted-foreground' />
              <span className='text-muted-foreground'>Currently at</span>
              <span className='font-medium text-foreground capitalize'>
                {candidate.current_company}
              </span>
            </div>
          </div>
        )}

        {/* Skills Section */}
        <div className='px-5 py-4'>
          <div className='flex flex-wrap gap-1.5 mb-4'>
            {candidate.skills.slice(0, 4).map(skill => (
              <Badge
                key={skill}
                variant='secondary'
                className='text-xs font-normal'
              >
                {skill}
              </Badge>
            ))}
            {candidate.skills.length > 4 && (
              <Badge variant='outline' className='text-xs'>
                +{candidate.skills.length - 4}
              </Badge>
            )}
          </div>

          {/* Contact Info */}
          <div className='space-y-2 pt-3 border-t border-border'>
            <div
              className='flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer'
              onClick={e => {
                e.stopPropagation();
                window.location.href = `mailto:${candidate.email}`;
              }}
            >
              <Mail className='h-3.5 w-3.5' />
              <span className='truncate'>{candidate.email}</span>
            </div>
            {!!candidate.phone_number && (
              <div
                className='flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer'
                onClick={e => {
                  e.stopPropagation();
                  window.location.href = `tel:${candidate.phone_number}`;
                }}
              >
                <Phone className='h-3.5 w-3.5' />
                <span>{candidate.phone_number}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className='px-5 pb-5'>
          <div className='flex gap-2'>
            <Button
              variant='outline'
              size='sm'
              className='flex-1'
              onClick={e => {
                e.stopPropagation();
                onViewProfile(candidate);
              }}
            >
              View Profile
            </Button>
            {onAddToPipeline && (
              <Button
                size='sm'
                className='flex-1'
                onClick={e => {
                  e.stopPropagation();
                  onAddToPipeline(candidate);
                }}
              >
                <UserPlus className='mr-1.5 h-3.5 w-3.5' />
                Add
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
