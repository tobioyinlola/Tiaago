"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/app/common/components/ui/dialog";
import { Button } from "@/app/common/components/ui/button";
import { Copy, Check, Loader2, ExternalLink } from "lucide-react";
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
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [inviteData, setInviteData] = useState<{
    invite_url: string;
    category_name: string;
    is_active: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setIsLoading(true);
      setError(null);
      setInviteData(null);
      setCopied(false);
    }
    onOpenChange(nextOpen);
  };

  useEffect(() => {
    if (!open || !categoryId) return;

    let cancelled = false;
    const fetchLink = async () => {
      const result = await generateInviteLink(categoryId);
      if (cancelled) return;
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
    };
    fetchLink();
    return () => {
      cancelled = true;
    };
  }, [open, categoryId]);

  const handleCopy = () => {
    if (!inviteData?.invite_url) return;
    navigator.clipboard.writeText(inviteData.invite_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Link copied to clipboard");
  };

  const retry = async () => {
    setIsLoading(true);
    setError(null);
    const result = await generateInviteLink(categoryId);
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
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[360px] p-0 gap-0 overflow-hidden">
        {/* Illustration header */}
        <div className="flex items-center justify-center bg-primary/5 px-6 pt-6 pb-4">
          <Image
            src="/assets/undraw_message-sent_iyz6.svg"
            alt=""
            width={180}
            height={140}
            className="h-[120px] sm:h-[140px] w-auto"
            priority
          />
        </div>

        <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-4">
          <DialogHeader className="pb-3 text-center sm:text-center">
            <DialogTitle className="text-lg">Share Invite Link</DialogTitle>
            <DialogDescription className="text-sm">
              Invite candidates to join your{" "}
              <span className="font-medium text-foreground">
                {categoryName}
              </span>{" "}
              pipeline
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <p className="text-sm text-destructive text-center">{error}</p>
              <Button variant="outline" size="sm" onClick={retry}>
                Try Again
              </Button>
            </div>
          ) : inviteData ? (
            <div className="space-y-3">
              {/* Clickable URL bar */}
              <button
                className="flex w-full items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-left hover:bg-muted transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                onClick={handleCopy}
                aria-label="Copy invite link to clipboard"
              >
                <span className="flex-1 truncate text-sm text-muted-foreground">
                  {inviteData.invite_url}
                </span>
                {copied ? (
                  <Check className="h-4 w-4 shrink-0 text-success" />
                ) : (
                  <Copy className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
              </button>

              {/* Actions — grouped together */}
              <div className="flex gap-2">
                <Button
                  onClick={handleCopy}
                  className="flex-1"
                  size="sm"
                >
                  {copied ? (
                    <>
                      <Check className="mr-1.5 h-3.5 w-3.5" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1.5 h-3.5 w-3.5" />
                      Copy Link
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    window.open(inviteData.invite_url, "_blank")
                  }
                  aria-label="Preview invite page in new tab"
                >
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                  Preview
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
