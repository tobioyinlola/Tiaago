"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/app/common/components/ui/dialog";
import { Button } from "@/app/common/components/ui/button";
import { Input } from "@/app/common/components/ui/input";
import { Link2, Copy, Check, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { generateInviteLink } from "@/app/common/services/sourcing";
import { ID } from "@/app/common/types";

interface TalentPoolInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: ID;
  categoryName: string;
}

export function TalentPoolInviteDialog({
  open,
  onOpenChange,
  categoryId,
  categoryName,
}: TalentPoolInviteDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [inviteData, setInviteData] = useState<{
    invite_url: string;
    category_name: string;
    is_active: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && categoryId) {
      setIsLoading(true);
      setError(null);
      setInviteData(null);
      generateInviteLink(categoryId).then(result => {
        if (result.success) {
          setInviteData({
            invite_url: result.data.invite_url,
            category_name: result.data.category_name,
            is_active: result.data.is_active,
          });
        } else {
          setError(result.error || "Failed to generate invite link.");
        }
        setIsLoading(false);
      });
    }
  }, [open, categoryId]);

  const handleCopy = () => {
    if (!inviteData?.invite_url) return;
    navigator.clipboard.writeText(inviteData.invite_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Link copied to clipboard");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            Share Invite Link
          </DialogTitle>
          <DialogDescription>
            Share this link with candidates to invite them to your{" "}
            <span className="font-medium text-foreground">{categoryName}</span>{" "}
            talent pipeline.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Generating invite link...
              </p>
            </div>
          ) : error ? (
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-center">
              <p className="text-sm text-destructive">{error}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => {
                  setIsLoading(true);
                  setError(null);
                  generateInviteLink(categoryId).then(result => {
                    if (result.success) {
                      setInviteData({
                        invite_url: result.data.invite_url,
                        category_name: result.data.category_name,
                        is_active: result.data.is_active,
                      });
                    } else {
                      setError(
                        result.error || "Failed to generate invite link."
                      );
                    }
                    setIsLoading(false);
                  });
                }}
              >
                Try Again
              </Button>
            </div>
          ) : inviteData ? (
            <>
              {/* Link Display */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Invite Link</label>
                <div className="flex gap-2">
                  <Input
                    value={inviteData.invite_url}
                    readOnly
                    className="bg-secondary/50 text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopy}
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Preview Card */}
              <div className="rounded-lg border border-border bg-card p-4 space-y-2">
                <h4 className="text-sm font-medium">
                  What candidates will see
                </h4>
                <p className="text-sm text-muted-foreground">
                  Candidates will land on a branded page where they can submit
                  their profile to join your{" "}
                  <span className="font-medium text-foreground">
                    {inviteData.category_name}
                  </span>{" "}
                  talent pipeline. They&apos;ll need a TIAAGO account to submit.
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button onClick={handleCopy} className="flex-1">
                  <Copy className="mr-2 h-4 w-4" />
                  {copied ? "Copied!" : "Copy Link"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    window.open(inviteData.invite_url, "_blank")
                  }
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Preview
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Share this link on job boards, social media, or directly with
                candidates.
              </p>
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
