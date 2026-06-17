"use client";

import { useState } from "react";
import Link from "next/link";
import { ServerCandidate } from "@/app/common/types";
import { emailTemplates } from "@/app/common/constants/mockCandidates";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/common/components/ui/select";
import { Send, Users, Loader2, AlertCircle, Settings } from "lucide-react";
import { toast } from "sonner";
import { sendOutreach } from "@/app/common/services/sourcing";

interface OutreachDialogProps {
  candidates: ServerCandidate[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend: (
    candidates: ServerCandidate[],
    subject: string,
    body: string
  ) => void;
}

export function OutreachDialog({
  candidates,
  open,
  onOpenChange,
  onSend,
}: OutreachDialogProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = emailTemplates.find(t => t.id === templateId);
    if (template) {
      setSubject(template.subject);
      setBody(template.body);
    }
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      toast.error("Please fill in both subject and message body.");
      return;
    }

    const candidateIds = candidates
      .map(c => (c as ServerCandidate & { id?: number }).id)
      .filter((id): id is number => !!id);

    if (candidateIds.length === 0) {
      toast.error("No valid candidates selected.");
      return;
    }

    setSending(true);
    const result = await sendOutreach({
      candidate_ids: candidateIds,
      subject,
      body,
    });
    setSending(false);

    if (result.success) {
      const { sent, failed, total } = result.data;
      if (sent > 0) {
        toast.success(
          `Sent ${sent} of ${total} email${total > 1 ? "s" : ""}${failed > 0 ? ` (${failed} failed)` : ""}`
        );
      } else {
        toast.error(`All ${total} emails failed to send.`);
      }
      onSend(candidates, subject, body);
      onOpenChange(false);
      setSelectedTemplate("");
      setSubject("");
      setBody("");
    } else {
      const errorMsg = result.error || "Failed to send outreach.";
      if (errorMsg.includes("not configured") || errorMsg.includes("not verified")) {
        toast.error(
          <div className="space-y-1">
            <p>{errorMsg}</p>
            <Link
              href="/startups/dashboard/settings?tab=email"
              className="text-primary underline text-xs"
            >
              Go to Email Settings
            </Link>
          </div>
        );
      } else {
        toast.error(errorMsg);
      }
    }
  };

  const candidatesWithEmail = candidates.filter(c => c.email);
  const candidatesWithoutEmail = candidates.filter(c => !c.email);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-xl'>
        <DialogHeader>
          <DialogTitle>Send Outreach</DialogTitle>
          <DialogDescription>
            Reach out to selected candidates with a personalized message.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4 py-4'>
          {/* Recipients */}
          <div className='rounded-lg bg-secondary/50 p-3'>
            <div className='flex items-center gap-2 text-sm text-muted-foreground'>
              <Users className='h-4 w-4' />
              <span>
                Sending to {candidatesWithEmail.length} candidate
                {candidatesWithEmail.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className='mt-2 flex flex-wrap gap-2'>
              {candidatesWithEmail.slice(0, 5).map((c, i) => (
                <span
                  key={i}
                  className='rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary capitalize'
                >
                  {c.name}
                </span>
              ))}
              {candidatesWithEmail.length > 5 && (
                <span className='rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground'>
                  +{candidatesWithEmail.length - 5} more
                </span>
              )}
            </div>
            {candidatesWithoutEmail.length > 0 && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600">
                <AlertCircle className="h-3 w-3" />
                {candidatesWithoutEmail.length} candidate
                {candidatesWithoutEmail.length !== 1 ? "s" : ""} skipped (no
                email)
              </div>
            )}
          </div>

          {/* Template Selection */}
          <div className='space-y-2'>
            <Label>Email Template</Label>
            <Select
              value={selectedTemplate}
              onValueChange={handleTemplateChange}
            >
              <SelectTrigger>
                <SelectValue placeholder='Select a template or write custom' />
              </SelectTrigger>
              <SelectContent>
                {emailTemplates.map(template => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Subject */}
          <div className='space-y-2'>
            <Label htmlFor='subject'>Subject</Label>
            <Input
              id='subject'
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder='Enter email subject...'
            />
          </div>

          {/* Body */}
          <div className='space-y-2'>
            <Label htmlFor='body'>Message</Label>
            <Textarea
              id='body'
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder='Write your message...'
              rows={8}
              className='resize-none'
            />
            <p className='text-xs text-muted-foreground'>
              Use placeholders: {"{{candidateName}}"}, {"{{role}}"},{" "}
              {"{{company}}"}, {"{{recruiterName}}"}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant='outline' onClick={() => onOpenChange(false)} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sending || candidatesWithEmail.length === 0}>
            {sending ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Sending...
              </>
            ) : (
              <>
                <Send className='mr-2 h-4 w-4' />
                Send Outreach
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
