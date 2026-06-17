"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { m, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/app/common/components/ui/dialog";
import { Button } from "@/app/common/components/ui/button";
import { Copy, Check, Loader2, Share2, Mail } from "lucide-react";
import { toast } from "sonner";
import { generateInviteLink } from "@/app/common/services/sourcing";
import { ID } from "@/app/common/types";

const SHARE_PLATFORMS = [
  {
    name: "LinkedIn",
    icon: "/assets/icons/social/linkedin.svg",
    getUrl: (url: string) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  },
  {
    name: "X",
    icon: "/assets/icons/social/x.svg",
    getUrl: (url: string, text: string) =>
      `https://x.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  },
  {
    name: "WhatsApp",
    icon: "/assets/icons/social/whatsapp.svg",
    getUrl: (url: string, text: string) =>
      `https://wa.me/?text=${encodeURIComponent(text + " " + url)}`,
  },
  {
    name: "Telegram",
    icon: "/assets/icons/social/telegram.svg",
    getUrl: (url: string, text: string) =>
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  },
  {
    name: "Slack",
    icon: "/assets/icons/social/slack.svg",
    getUrl: (url: string) => `https://slack.com/share?url=${encodeURIComponent(url)}`,
  },
] as const;

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
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && !!navigator.share);
  }, []);

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

  const shareText = `Join our ${categoryName} talent pipeline on TIAAGO`;

  const handleCopy = () => {
    if (!inviteData?.invite_url) return;
    navigator.clipboard.writeText(inviteData.invite_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Link copied to clipboard");
  };

  const handleNativeShare = async () => {
    if (!inviteData?.invite_url) return;
    try {
      await navigator.share({
        title: `Join ${categoryName} on TIAAGO`,
        text: shareText,
        url: inviteData.invite_url,
      });
    } catch {
      // user cancelled share — ignore
    }
  };

  const handleSocialShare = (platform: (typeof SHARE_PLATFORMS)[number]) => {
    if (!inviteData?.invite_url) return;
    window.open(
      platform.getUrl(inviteData.invite_url, shareText),
      "_blank",
      "noopener,noreferrer,width=600,height=500"
    );
  };

  const handleEmailShare = () => {
    if (!inviteData?.invite_url) return;
    const subject = encodeURIComponent(`Join ${categoryName} on TIAAGO`);
    const body = encodeURIComponent(
      `${shareText}\n\nApply here: ${inviteData.invite_url}`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
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
      <DialogContent className="!max-w-[calc(100vw-2rem)] sm:!max-w-sm p-0 gap-0 overflow-hidden">
        {/* Illustration header */}
        <div className="flex items-center justify-center bg-primary/5 pt-5 sm:pt-6 pb-3 overflow-hidden">
          <AnimatePresence>
            {open && (
              <m.div
                initial={{ opacity: 0, y: 24, scale: 0.85 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
              >
                <Image
                  src="/assets/undraw_message-sent_iyz6.svg"
                  alt=""
                  width={220}
                  height={180}
                  className="h-[120px] sm:h-[150px] w-auto"
                  priority
                />
              </m.div>
            )}
          </AnimatePresence>
        </div>

        <div className="px-4 sm:px-6 pb-5 pt-3">
          <DialogHeader className="pb-4 text-center sm:text-center">
            <DialogTitle className="text-base sm:text-lg">
              Share Invite Link
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Invite candidates to join{" "}
              <span className="font-medium text-foreground">
                {categoryName}
              </span>
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
            <div className="space-y-4">
              {/* URL bar + copy */}
              <div className="flex gap-2">
                <button
                  className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-left hover:bg-muted transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  onClick={handleCopy}
                  aria-label="Copy invite link to clipboard"
                >
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    {inviteData.invite_url.replace(/^https?:\/\//, "")}
                  </span>
                  {copied ? (
                    <Check className="h-3.5 w-3.5 shrink-0 text-success" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  )}
                </button>
                <Button onClick={handleCopy} size="sm" className="shrink-0">
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>

              {/* Share via section */}
              <div>
                <p className="text-xs text-muted-foreground mb-2.5 text-center">
                  Share via
                </p>

                {/* Native share for mobile */}
                {canNativeShare && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mb-3 sm:hidden"
                    onClick={handleNativeShare}
                  >
                    <Share2 className="mr-1.5 h-3.5 w-3.5" />
                    Share to App
                  </Button>
                )}

                {/* Social icons */}
                <div className="flex items-center justify-center gap-3">
                  {SHARE_PLATFORMS.map(platform => (
                    <button
                      key={platform.name}
                      onClick={() => handleSocialShare(platform)}
                      className="flex size-9 items-center justify-center rounded-full border border-border bg-card hover:bg-muted transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      aria-label={`Share on ${platform.name}`}
                    >
                      <Image
                        src={platform.icon}
                        alt={platform.name}
                        width={18}
                        height={18}
                        className="size-[18px]"
                      />
                    </button>
                  ))}
                  <button
                    onClick={handleEmailShare}
                    className="flex size-9 items-center justify-center rounded-full border border-border bg-card hover:bg-muted transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    aria-label="Share via Email"
                  >
                    <Mail className="size-[18px] text-muted-foreground" />
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
