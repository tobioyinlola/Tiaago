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
      <DialogContent className="max-w-sm gap-0">
        <DialogHeader className="pb-4">
          <DialogTitle>Invite Link</DialogTitle>
          <DialogDescription>
            Share with candidates to join{" "}
            <span className="font-medium text-foreground">{categoryName}</span>
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={retry}>
              Try Again
            </Button>
          </div>
        ) : inviteData ? (
          <div className="space-y-4">
            <div
              className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2.5 cursor-pointer hover:bg-muted transition-colors"
              onClick={handleCopy}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === "Enter" && handleCopy()}
              aria-label="Copy invite link"
            >
              <span className="flex-1 truncate text-sm text-muted-foreground select-all">
                {inviteData.invite_url}
              </span>
              {copied ? (
                <Check className="h-4 w-4 shrink-0 text-success" />
              ) : (
                <Copy className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
            </div>

            <div className="flex gap-2">
              <Button onClick={handleCopy} className="flex-1" size="sm">
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
                onClick={() => window.open(inviteData.invite_url, "_blank")}
                aria-label="Preview invite page"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
