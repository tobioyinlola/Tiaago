import { useState } from "react";
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
import { Send, Users } from "lucide-react";
import { toast } from "sonner";

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

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = emailTemplates.find(t => t.id === templateId);
    if (template) {
      setSubject(template.subject);
      setBody(template.body);
    }
  };

  const handleSend = () => {
    if (!subject.trim() || !body.trim()) {
      toast.error("Missing Information", {
        description: "Please fill in both subject and message body.",
      });
      return;
    }

    onSend(candidates, subject, body);
    toast.success("Outreach Sent", {
      description: `Successfully sent outreach to ${
        candidates.length
      } candidate${candidates.length > 1 ? "s" : ""}.`,
    });
    onOpenChange(false);
    setSelectedTemplate("");
    setSubject("");
    setBody("");
  };

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
                Sending to {candidates.length} candidate
                {candidates.length > 1 ? "s" : ""}
              </span>
            </div>
            <div className='mt-2 flex flex-wrap gap-2'>
              {candidates.slice(0, 5).map((c, i) => (
                <span
                  key={i}
                  className='rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary capitalize'
                >
                  {c.name}
                </span>
              ))}
              {candidates.length > 5 && (
                <span className='rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground'>
                  +{candidates.length - 5} more
                </span>
              )}
            </div>
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
              {"{{company}}"}, {"{{skills}}"}, {"{{recruiterName}}"},{" "}
              {"{{jobLink}}"}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSend}>
            <Send className='mr-2 h-4 w-4' />
            Send Outreach
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
