"use client";
import { PipelineEntry, ServerCandidate } from "@/app/common/types";
import { Card, CardContent } from "@/app/common/components/ui/card";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/app/common/components/ui/avatar";
import { Badge } from "@/app/common/components/ui/badge";
import { Button } from "@/app/common/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/app/common/components/ui/dropdown-menu";
import {
  Mail,
  Phone,
  MapPin,
  MoreHorizontal,
  Send,
  Trash2,
  UserCheck,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface PipelineCardProps {
  candidate: PipelineEntry;
  onViewProfile: (candidate: PipelineEntry) => void;
  onSendOutreach: (candidate: PipelineEntry) => void;
  onRemove: (candidate: PipelineEntry) => void;
  onInvite: (candidate: PipelineEntry) => void;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase();
}

function getStatusVariant(status: PipelineEntry["status"]) {
  switch (status) {
    case "contacted":
      return "info";
    case "interested":
      return "success";
    case "not-interested":
      return "destructive";
    case "hired":
      return "purple";
    default:
      return "secondary";
  }
}

export function PipelineCard({
  candidate,
  onViewProfile,
  onSendOutreach,
  onRemove,
  onInvite,
}: PipelineCardProps) {
  const sourcedDate = candidate.created_at
    ? formatDistanceToNow(new Date(candidate.created_at), { addSuffix: true })
    : "Recently";

  return (
    <Card className='group transition-all duration-200 hover:shadow-card-hover animate-fade-in'>
      <CardContent className='p-4'>
        <div className='flex items-start gap-4'>
          {/* Avatar */}
          <Avatar className='h-12 w-12 shrink-0 ring-2 ring-background shadow-soft'>
            <AvatarImage src={candidate.avatar} />
            <AvatarFallback className='bg-primary/10 text-primary font-semibold'>
              {getInitials(candidate.name)}
            </AvatarFallback>
          </Avatar>

          {/* Info */}
          <div className='flex-1 min-w-0'>
            <div className='flex items-start justify-between gap-2'>
              <div>
                <h3
                  className='font-semibold text-foreground cursor-pointer hover:text-primary transition-colors capitalize'
                  onClick={() => onViewProfile(candidate)}
                >
                  {candidate.name}
                </h3>
                <p className='text-sm text-muted-foreground capitalize'>
                  {candidate.role}
                </p>
              </div>

              <div className='flex items-center gap-2 capitalize'>
                <Badge variant={getStatusVariant(candidate.status)}>
                  {candidate.status.replace("-", " ")}
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant='ghost' size='icon' className='h-8 w-8'>
                      <MoreHorizontal className='h-4 w-4' />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align='end'>
                    <DropdownMenuItem onClick={() => onSendOutreach(candidate)}>
                      <Send className='mr-2 h-4 w-4' />
                      Send Outreach
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onInvite(candidate)}>
                      <UserCheck className='mr-2 h-4 w-4' />
                      Invite to Apply
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onRemove(candidate)}
                      className='text-destructive focus:text-destructive'
                    >
                      <Trash2 className='mr-2 h-4 w-4' />
                      Remove from Pipeline
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Contact & Location */}
            <div className='mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground'>
              <span className='flex items-center gap-1 capitalize'>
                <MapPin className='h-3 w-3' />
                {candidate.country}
              </span>
              <span className='flex items-center gap-1'>
                <Mail className='h-3 w-3' />
                {candidate.email}
              </span>
              <span className='flex items-center gap-1'>
                <Phone className='h-3 w-3' />
                {candidate.phone_number}
              </span>
            </div>

            {/* Skills & Experience Level */}
            <div className='mt-3 flex flex-wrap gap-1.5'>
              {candidate.experience_level && (
                <Badge variant='default' className='text-xs'>
                  {candidate.experience_level}
                </Badge>
              )}
              {candidate.skills.slice(0, 4).map(skill => (
                <Badge key={skill} variant='secondary' className='text-xs'>
                  {skill}
                </Badge>
              ))}
              {candidate.skills.length > 4 && (
                <Badge variant='outline' className='text-xs'>
                  +{candidate.skills.length - 4}
                </Badge>
              )}
            </div>

            {/* Footer */}
            <div className='mt-3 flex items-center justify-between border-t border-border pt-3'>
              <span className='text-xs text-muted-foreground'>
                Sourced {sourcedDate}
              </span>
              <div className='flex gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => onViewProfile(candidate)}
                >
                  View Profile
                </Button>
                <Button size='sm' onClick={() => onSendOutreach(candidate)}>
                  <Send className='mr-1.5 h-3.5 w-3.5' />
                  Reach Out
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
