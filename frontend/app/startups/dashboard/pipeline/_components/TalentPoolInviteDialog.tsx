"use client";
import { useState, useEffect } from "react";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/common/components/ui/tabs";
import { Mail, Link2, Copy, Check, Send, Users, Building2 } from "lucide-react";
import { toast } from "sonner";

interface TalentPoolInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface OrgSettings {
  organizationName: string;
  recruiterName: string;
}

export function TalentPoolInviteDialog({
  open,
  onOpenChange,
}: TalentPoolInviteDialogProps) {
  const [orgSettings, setOrgSettings] = useState<OrgSettings>({
    organizationName: "",
    recruiterName: "",
  });
  const [email, setEmail] = useState("");
  const [emails, setEmails] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("orgSettings");
    if (stored) {
      const parsed = JSON.parse(stored);
      setTimeout(() => setOrgSettings(parsed), 0);
    }
  }, [open]);

  const orgName = orgSettings.organizationName || "Our Company";
  const recruiterName = orgSettings.recruiterName || "The Talent Team";

  const defaultMessage = `Hi there,

${recruiterName} from ${orgName} here! We're always looking to connect with exceptional talent, and your profile caught our attention.

We'd love to have you join our exclusive talent network at ${orgName}. By joining, you'll be among the first to hear about exciting opportunities that match your skills and career goals.

Here's what you'll get:
• Early access to new positions before they're publicly posted
• Direct connection to our recruiting team
• Updates on company news and growth

Click the link below to create your profile and join the ${orgName} talent community:
{{inviteLink}}

We're excited about the possibility of working together!

Best regards,
${recruiterName}
${orgName}`;

  const [prevOrgSettings, setPrevOrgSettings] = useState(orgSettings);
  const [message, setMessage] = useState(defaultMessage);

  if (orgSettings !== prevOrgSettings) {
    setPrevOrgSettings(orgSettings);
    setMessage(defaultMessage);
  }

  const inviteLink = `${
    window.location.origin
  }/join-talent-pool?org=${encodeURIComponent(orgName)}&ref=invite`;

  const handleAddEmail = () => {
    if (email && !emails.includes(email) && email.includes("@")) {
      setEmails([...emails, email]);
      setEmail("");
    }
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    setEmails(emails.filter(e => e !== emailToRemove));
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Link Copied", {
      description: "Invite link copied to clipboard.",
    });
  };

  const handleSendInvites = () => {
    if (emails.length === 0) {
      toast.error("No Recipients", {
        description: "Please add at least one email address.",
      });
      return;
    }

    toast.success("Invitations Sent", {
      description: `Successfully sent ${emails.length} invitation${
        emails.length !== 1 ? "s" : ""
      } from ${orgName}.`,
    });
    setEmails([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-lg'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <Users className='h-5 w-5 text-primary' />
            Invite to {orgName} Talent Pool
          </DialogTitle>
          <DialogDescription>
            Grow your talent network by inviting candidates to join {orgName}
            &apos;s pipeline.
          </DialogDescription>
        </DialogHeader>

        {!orgSettings.organizationName && (
          <div className='flex items-start gap-3 p-3 rounded-lg bg-warning/10 border border-warning/20 text-sm'>
            <Building2 className='h-4 w-4 text-warning mt-0.5 shrink-0' />
            <div>
              <p className='font-medium text-foreground'>
                Set up your organization
              </p>
              <p className='text-muted-foreground'>
                Go to{" "}
                <a href='/settings' className='text-primary underline'>
                  Settings
                </a>{" "}
                to add your organization name for personalized invitations.
              </p>
            </div>
          </div>
        )}

        <Tabs defaultValue='email' className='mt-2'>
          <TabsList className='grid w-full grid-cols-2'>
            <TabsTrigger value='email' className='gap-2'>
              <Mail className='h-4 w-4' />
              Email Invite
            </TabsTrigger>
            <TabsTrigger value='link' className='gap-2'>
              <Link2 className='h-4 w-4' />
              Share Link
            </TabsTrigger>
          </TabsList>

          <TabsContent value='email' className='space-y-4 pt-4'>
            <div className='space-y-2'>
              <Label htmlFor='email'>Email Addresses</Label>
              <div className='flex gap-2'>
                <Input
                  id='email'
                  type='email'
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder='Enter email address'
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddEmail();
                    }
                  }}
                />
                <Button
                  type='button'
                  variant='outline'
                  onClick={handleAddEmail}
                >
                  Add
                </Button>
              </div>
            </div>

            {emails.length > 0 && (
              <div className='flex flex-wrap gap-2 p-3 rounded-lg bg-secondary/50'>
                {emails.map(e => (
                  <span
                    key={e}
                    className='inline-flex items-center gap-1 px-2 py-1 rounded-full bg-card border border-border text-sm'
                  >
                    {e}
                    <button
                      onClick={() => handleRemoveEmail(e)}
                      className='ml-1 text-muted-foreground hover:text-destructive'
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className='space-y-2'>
              <Label htmlFor='message'>Invitation Message</Label>
              <Textarea
                id='message'
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={10}
                className='resize-none text-sm'
              />
              <p className='text-xs text-muted-foreground'>
                Use {"{{inviteLink}}"} to include the invite link in your
                message.
              </p>
            </div>
          </TabsContent>

          <TabsContent value='link' className='space-y-4 pt-4'>
            <div className='space-y-2'>
              <Label>Shareable Invite Link</Label>
              <div className='flex gap-2'>
                <Input
                  value={inviteLink}
                  readOnly
                  className='bg-secondary/50 text-sm'
                />
                <Button
                  variant='outline'
                  onClick={handleCopyLink}
                  className='shrink-0'
                >
                  {copied ? (
                    <Check className='h-4 w-4 text-success' />
                  ) : (
                    <Copy className='h-4 w-4' />
                  )}
                </Button>
              </div>
              <p className='text-xs text-muted-foreground'>
                Share this link on social media, job boards, or anywhere
                you&apos;d like to attract talent.
              </p>
            </div>

            <div className='rounded-lg border border-border p-4 bg-card'>
              <h4 className='text-sm font-medium mb-2'>
                What candidates will see:
              </h4>
              <p className='text-sm text-muted-foreground'>
                They&apos;ll be directed to a branded signup page for{" "}
                <strong>{orgName}</strong> where they can create their profile
                with skills, experience, and contact info. Once submitted,
                they&apos;ll appear in your talent pool.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className='mt-4'>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSendInvites}>
            <Send className='mr-2 h-4 w-4' />
            Send Invites ({emails.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
