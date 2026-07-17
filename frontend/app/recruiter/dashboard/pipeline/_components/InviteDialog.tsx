"use client";
import { useState } from "react";
import { PipelineEntry } from "@/app/common/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/app/common/components/ui/dialog";
import { Button } from "@/app/common/components/ui/button";
import { Label } from "@/app/common/components/ui/label";
import { Input } from "@/app/common/components/ui/input";
import { Textarea } from "@/app/common/components/ui/textarea";
import { UserCheck } from "lucide-react";
import { toast } from "sonner";

interface InviteDialogProps {
  candidate: PipelineEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteDialog({
  candidate,
  open,
  onOpenChange,
}: InviteDialogProps) {
  const [jobTitle, setJobTitle] = useState("");
  const [message, setMessage] = useState(`Hi {{candidateName}},

We have an exciting opportunity that matches your skills and experience. We'd love to invite you to apply for this role.

Click the link below to start your application:
{{applicationLink}}

Looking forward to hearing from you!

Best regards,
{{recruiterName}}`);

  const handleInvite = () => {
    if (!jobTitle.trim()) {
      toast.error("Job Title Required", {
        description: "Please enter a job title for the invitation.",
      });
      return;
    }

    // In a real app, this would send the invite via backend
    toast.success("Invitation Sent", {
      description: `Successfully invited ${candidate?.name} to apply for ${jobTitle}.`,
    });
    onOpenChange(false);
    setJobTitle("");
  };

  if (!candidate) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-lg'>
        <DialogHeader>
          <DialogTitle>Invite to Apply</DialogTitle>
          <DialogDescription>
            Send {candidate.name} an invitation to apply for a position.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4 py-4'>
          <div className='space-y-2'>
            <Label htmlFor='jobTitle'>Job Title</Label>
            <Input
              id='jobTitle'
              value={jobTitle}
              onChange={e => setJobTitle(e.target.value)}
              placeholder='e.g., Senior Frontend Developer'
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='message'>Invitation Message</Label>
            <Textarea
              id='message'
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={8}
              className='resize-none'
            />
            <p className='text-xs text-muted-foreground'>
              Placeholders: {"{{candidateName}}"}, {"{{applicationLink}}"},{" "}
              {"{{recruiterName}}"}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleInvite}>
            <UserCheck className='mr-2 h-4 w-4' />
            Send Invitation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
