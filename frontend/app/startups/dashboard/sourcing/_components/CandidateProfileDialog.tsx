import { ServerCandidate } from "@/app/common/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/app/common/components/ui/dialog";
import { Badge } from "@/app/common/components/ui/badge";
import { Button } from "@/app/common/components/ui/button";
import {
  Mail,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  Linkedin,
  UserPlus,
  Send,
  Clock,
} from "lucide-react";

interface CandidateProfileDialogProps {
  candidate: ServerCandidate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSendOutreach: (candidate: ServerCandidate) => void;
  onAddToPipeline?: (candidate: ServerCandidate) => void;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase();
}

export function CandidateProfileDialog({
  candidate,
  open,
  onOpenChange,
  onSendOutreach,
  onAddToPipeline,
}: CandidateProfileDialogProps) {
  if (!candidate) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle className='sr-only'>ServerCandidate Profile</DialogTitle>
        </DialogHeader>

        <div className='space-y-6'>
          {/* Header - Name, Role, Country, Experience */}
          <div className='flex items-start gap-4'>
            <div className='h-20 w-20 rounded-full bg-primary flex items-center justify-center ring-2 ring-background shadow-soft shrink-0'>
              <span className='text-2xl font-bold text-primary-foreground'>
                {getInitials(candidate.name)}
              </span>
            </div>

            <div className='flex-1 capitalize'>
              <h2 className='text-xl font-semibold text-foreground'>
                {candidate.name}
              </h2>
              <p className='text-muted-foreground'>{candidate.role}</p>

              <div className='mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground'>
                <span className='flex items-center gap-1'>
                  <MapPin className='h-4 w-4' />
                  {candidate.country}
                </span>
                <span className='flex items-center gap-1'>
                  <Clock className='h-4 w-4' />
                  {candidate.current_company}
                </span>
              </div>
            </div>
          </div>

          {/* Contact Info - Email, LinkedIn, Phone */}
          <div className='rounded-lg bg-secondary/50 p-4'>
            <h3 className='mb-3 text-sm font-semibold text-foreground'>
              Contact Information
            </h3>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              <div className='flex items-center gap-2'>
                <Mail className='h-4 w-4 text-muted-foreground' />
                <a
                  href={`mailto:${candidate.email}`}
                  className='text-sm text-primary hover:underline'
                >
                  {candidate.email}
                </a>
              </div>
              {!!candidate.linkdIn_profile && (
                <div className='flex items-center gap-2'>
                  <Linkedin className='h-4 w-4 text-muted-foreground' />
                  <a
                    href={`https://${candidate.linkdIn_profile}`}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='text-sm text-primary hover:underline'
                  >
                    LinkedIn Profile
                  </a>
                </div>
              )}
              {!!candidate.phone_number && (
                <div className='flex items-center gap-2'>
                  <Phone className='h-4 w-4 text-muted-foreground' />
                  <a
                    href={`tel:${candidate.phone_number}`}
                    className='text-sm text-primary hover:underline'
                  >
                    {candidate.phone_number}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Summary */}
          <div>
            <h3 className='mb-2 text-sm font-semibold text-foreground'>
              Summary
            </h3>
            <p
              className='text-sm text-muted-foreground leading-relaxed'
              dangerouslySetInnerHTML={{ __html: candidate.summary || "" }}
            />
          </div>

          {/* Work Experience */}
          {candidate.experience && candidate.experience.length > 0 && (
            <div>
              <h3 className='mb-3 text-sm font-semibold text-foreground flex items-center gap-2'>
                <Briefcase className='h-4 w-4' />
                Work Experience
              </h3>
              <div className='space-y-3 capitalize'>
                {candidate.experience.map((exp, index) => (
                  <div
                    key={index}
                    className='rounded-lg border border-border p-3'
                  >
                    <p className='font-medium text-foreground'>
                      {exp.title?.name}
                    </p>
                    <p className='text-sm text-muted-foreground'>
                      {exp.company?.name}
                    </p>
                    <p className='text-xs text-muted-foreground mt-1'>
                      {exp.start_date} - {exp.end_date || "Present"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Education */}
          {candidate.education && (
            <div className='rounded-lg border border-border p-3'>
              <div className='flex items-center gap-2 text-muted-foreground'>
                <GraduationCap className='h-4 w-4' />
                <span className='text-xs'>Education</span>
              </div>
              <p className='mt-1 font-medium capitalize'>
                {candidate.education}
              </p>
            </div>
          )}

          {/* Skills */}
          <div>
            <h3 className='mb-3 text-sm font-semibold text-foreground'>
              Skills
            </h3>
            <div className='flex flex-wrap gap-2'>
              {candidate.skills.map(skill => (
                <Badge key={skill} variant='info'>
                  {skill}
                </Badge>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className='flex gap-3 border-t border-border pt-4'>
            <Button
              className='flex-1'
              onClick={() => onSendOutreach(candidate)}
            >
              <Send className='mr-2 h-4 w-4' />
              Send Outreach
            </Button>
            {onAddToPipeline && (
              <Button
                variant='outline'
                onClick={() => onAddToPipeline(candidate)}
              >
                <UserPlus className='mr-2 h-4 w-4' />
                Add to Pipeline
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
