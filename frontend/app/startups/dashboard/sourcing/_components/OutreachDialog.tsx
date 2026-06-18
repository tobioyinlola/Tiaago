"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { ServerCandidate } from "@/app/common/types";
import { emailTemplates } from "@/app/common/constants/mockCandidates";
import {
  Dialog,
  DialogContent,
} from "@/app/common/components/ui/dialog";
import { Button } from "@/app/common/components/ui/button";
import { Label } from "@/app/common/components/ui/label";
import { Input } from "@/app/common/components/ui/input";
import { Textarea } from "@/app/common/components/ui/textarea";
import { Badge } from "@/app/common/components/ui/badge";
import {
  Send,
  Users,
  Loader2,
  AlertCircle,
  Mail,
  FileText,
  Eye,
  EyeOff,
  ExternalLink,
  ArrowRight,
  ArrowLeft,
  Lock,
  CheckCircle2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  sendOutreach,
  getSmtpConfig,
  saveSmtpConfig,
  SmtpConfig,
} from "@/app/common/services/sourcing";

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

type SetupStep = "intro" | "2fa" | "app-password" | "enter-password";

/* ── Inline Email Preview ──────────────────────────────────────── */

function EmailPreview({
  subject,
  body,
  recipientName,
}: {
  subject: string;
  body: string;
  recipientName: string;
}) {
  const previewBody = useMemo(() => {
    let text = body || "Your message will appear here...";
    text = text
      .replace(/\{\{candidateName\}\}/g, recipientName || "John")
      .replace(/\{\{company\}\}/g, "Your Company")
      .replace(/\{\{role\}\}/g, "Software Engineer")
      .replace(/\{\{recruiterName\}\}/g, "You")
      .replace(/\{\{skills\}\}/g, "React, TypeScript")
      .replace(/\{\{jobLink\}\}/g, "#");
    return text;
  }, [body, recipientName]);

  const previewSubject = useMemo(() => {
    let text = subject || "Email subject";
    text = text
      .replace(/\{\{company\}\}/g, "Your Company")
      .replace(/\{\{role\}\}/g, "Software Engineer");
    return text;
  }, [subject]);

  return (
    <div className="rounded-lg border border-border overflow-hidden bg-[#EEF1FB] shadow-inner">
      {/* Header gradient bar */}
      <div
        className="px-5 py-4"
        style={{
          background: "linear-gradient(135deg, #1C3477, #5465FF)",
        }}
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-white/20 flex items-center justify-center">
            <Mail className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-white/90 text-xs font-medium tracking-wide uppercase">
            TIAAGO
          </span>
        </div>
      </div>

      {/* Email body */}
      <div className="bg-white mx-3 my-3 rounded-lg px-5 py-4 shadow-sm">
        <p className="text-xs font-semibold text-foreground mb-3">
          {previewSubject}
        </p>
        <div className="text-[11px] leading-relaxed text-muted-foreground whitespace-pre-line max-h-[220px] overflow-y-auto">
          {previewBody}
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-2.5 text-center">
        <p className="text-[10px] text-muted-foreground/60">
          Sent via TIAAGO
        </p>
      </div>
    </div>
  );
}

/* ── Inline SMTP Setup Wizard ──────────────────────────────────── */

function InlineSmtpWizard({
  onComplete,
  onCancel,
}: {
  onComplete: (config: SmtpConfig) => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState<SetupStep>("intro");
  const [appPassword, setAppPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  const ILLUSTRATIONS: Record<SetupStep, string> = {
    intro: "/assets/illustrations/email-intro.svg",
    "2fa": "/assets/illustrations/two-factor-auth.svg",
    "app-password": "/assets/illustrations/app-password.svg",
    "enter-password": "/assets/illustrations/email-connect.svg",
  };

  const handleSave = async () => {
    if (!appPassword.trim()) return;
    setSaving(true);
    const result = await saveSmtpConfig({
      gmail_address: "",
      app_password: appPassword.replace(/\s/g, ""),
    });
    setSaving(false);
    if (result.success) {
      toast.success("Gmail connected!");
      onComplete(result.data);
    } else {
      toast.error(
        result.error || "Failed to connect. Check your App Password."
      );
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Wizard header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/30">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" />
            Connect Gmail to Send Outreach
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Quick one-time setup, takes about 2 minutes
          </p>
        </div>
        <button
          onClick={onCancel}
          className="text-muted-foreground hover:text-foreground p-1 rounded"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-col md:flex-row flex-1 min-h-0">
        {/* Left — illustration */}
        <div className="hidden md:flex md:w-2/5 items-center justify-center p-6 bg-gradient-to-br from-primary/[0.04] to-primary/[0.08]">
          <Image
            src={ILLUSTRATIONS[step]}
            alt=""
            width={200}
            height={200}
            className="w-full max-w-[180px] h-auto object-contain opacity-90"
          />
        </div>

        {/* Right — content */}
        <div className="flex-1 p-5 overflow-y-auto flex flex-col justify-center">
          {step === "intro" && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-foreground">
                  How it works
                </h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Create a Gmail{" "}
                  <strong className="text-foreground">App Password</strong> so
                  TIAAGO can send emails on your behalf without exposing your
                  Google password.
                </p>
              </div>
              <div className="space-y-2.5">
                {[
                  "Enable 2-Step Verification",
                  "Create an App Password",
                  "Paste it here and we test the connection",
                ].map((text, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <span className="flex items-center justify-center w-6 h-6 rounded-md bg-primary/10 text-primary text-xs font-bold shrink-0">
                      {i + 1}
                    </span>
                    <p className="text-sm text-muted-foreground">{text}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-2.5 pt-1">
                <Button size="sm" onClick={() => setStep("2fa")}>
                  Get Started
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="ghost" onClick={onCancel}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {step === "2fa" && (
            <div className="space-y-4">
              <div>
                <Badge variant="secondary" className="text-xs mb-1.5">
                  Step 1 of 3
                </Badge>
                <h4 className="font-semibold text-foreground">
                  Enable 2-Step Verification
                </h4>
                <p className="text-sm text-muted-foreground mt-1">
                  App Passwords require 2FA. If already enabled, skip ahead.
                </p>
              </div>
              <a
                href="https://myaccount.google.com/signinoptions/two-step-verification"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80"
              >
                Open Google 2-Step Verification
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-2.5 pt-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setStep("intro")}
                >
                  <ArrowLeft className="mr-1 h-3.5 w-3.5" />
                  Back
                </Button>
                <Button
                  size="sm"
                  onClick={() => setStep("app-password")}
                >
                  I&apos;ve enabled 2FA
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}

          {step === "app-password" && (
            <div className="space-y-4">
              <div>
                <Badge variant="secondary" className="text-xs mb-1.5">
                  Step 2 of 3
                </Badge>
                <h4 className="font-semibold text-foreground">
                  Create an App Password
                </h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Name it <strong className="text-foreground">TIAAGO</strong>,
                  then copy the 16-character password.
                </p>
              </div>
              <a
                href="https://myaccount.google.com/apppasswords"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80"
              >
                Open Google App Passwords
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-2.5 pt-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setStep("2fa")}
                >
                  <ArrowLeft className="mr-1 h-3.5 w-3.5" />
                  Back
                </Button>
                <Button
                  size="sm"
                  onClick={() => setStep("enter-password")}
                >
                  I&apos;ve copied it
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}

          {step === "enter-password" && (
            <div className="space-y-4">
              <div>
                <Badge variant="secondary" className="text-xs mb-1.5">
                  Step 3 of 3
                </Badge>
                <h4 className="font-semibold text-foreground">
                  Enter your App Password
                </h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Paste the 16-character password. We&apos;ll test the
                  connection.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wizard-app-password" className="text-xs">
                  Gmail App Password
                </Label>
                <div className="relative">
                  <input
                    id="wizard-app-password"
                    type={showPassword ? "text" : "password"}
                    value={appPassword}
                    onChange={(e) => setAppPassword(e.target.value)}
                    placeholder="xxxx xxxx xxxx xxxx"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono tracking-widest pr-10 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary focus-visible:outline-none"
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  Encrypted before storage
                </p>
              </div>
              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-2.5 pt-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setStep("app-password")}
                  disabled={saving}
                >
                  <ArrowLeft className="mr-1 h-3.5 w-3.5" />
                  Back
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={saving || !appPassword.trim()}
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      Connect Gmail
                      <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Main OutreachDialog ───────────────────────────────────────── */

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
  const [showPreview, setShowPreview] = useState(true);

  const [smtpStatus, setSmtpStatus] = useState<
    "loading" | "not-configured" | "configured"
  >("loading");
  const [smtpConfig, setSmtpConfig] = useState<SmtpConfig | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getSmtpConfig().then((result) => {
      if (cancelled) return;
      if (result.success && result.data?.is_verified) {
        setSmtpConfig(result.data);
        setSmtpStatus("configured");
      } else {
        setSmtpStatus("not-configured");
      }
    });
    return () => { cancelled = true; };
  }, [open]);

  const handleSmtpSetupComplete = (config: SmtpConfig) => {
    setSmtpConfig(config);
    setSmtpStatus("configured");
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = emailTemplates.find((t) => t.id === templateId);
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
      .map((c) => (c as ServerCandidate & { id?: number }).id)
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
      if (
        errorMsg.includes("not configured") ||
        errorMsg.includes("not verified")
      ) {
        setSmtpStatus("not-configured");
      } else {
        toast.error(errorMsg);
      }
    }
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      onOpenChange(false);
      setSelectedTemplate("");
      setSubject("");
      setBody("");
      setSmtpStatus("loading");
      setSmtpConfig(null);
    }
  };

  const candidatesWithEmail = candidates.filter((c) => c.email);
  const candidatesWithoutEmail = candidates.filter((c) => !c.email);
  const firstRecipient = candidatesWithEmail[0]?.name || "Candidate";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className={`p-0 gap-0 overflow-hidden max-sm:max-w-[95vw] max-sm:rounded-xl ${
          smtpStatus === "not-configured"
            ? "sm:max-w-2xl"
            : "sm:max-w-4xl"
        }`}
      >
        {/* Loading state */}
        {smtpStatus === "loading" && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {/* SMTP not configured — inline wizard */}
        {smtpStatus === "not-configured" && (
          <InlineSmtpWizard
            onComplete={handleSmtpSetupComplete}
            onCancel={() => onOpenChange(false)}
          />
        )}

        {/* SMTP configured — compose view */}
        {smtpStatus === "configured" && (
          <div className="flex flex-col max-h-[85vh]">
            {/* Dialog header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
                  <Send className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">
                    Send Outreach
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    via {smtpConfig?.gmail_address}
                  </p>
                </div>
              </div>
              <div className="hidden md:flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs gap-1.5"
                  onClick={() => setShowPreview(!showPreview)}
                >
                  {showPreview ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                  Preview
                </Button>
              </div>
            </div>

            {/* Body: compose + preview */}
            <div className="flex flex-1 min-h-0 overflow-hidden">
              {/* Left — Compose */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3 sm:space-y-4">
                {/* Recipients */}
                <div className="rounded-lg bg-muted/40 border border-border p-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <Users className="h-3.5 w-3.5" />
                    <span>
                      {candidatesWithEmail.length} recipient
                      {candidatesWithEmail.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {candidatesWithEmail.slice(0, 8).map((c, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center rounded-md bg-card border border-border px-2 py-0.5 text-xs font-medium text-foreground capitalize"
                      >
                        {c.name}
                      </span>
                    ))}
                    {candidatesWithEmail.length > 8 && (
                      <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        +{candidatesWithEmail.length - 8} more
                      </span>
                    )}
                  </div>
                  {candidatesWithoutEmail.length > 0 && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600">
                      <AlertCircle className="h-3 w-3" />
                      {candidatesWithoutEmail.length} skipped (no email)
                    </div>
                  )}
                </div>

                {/* Template cards */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Quick Templates
                  </Label>
                  <div className="flex sm:grid sm:grid-cols-3 gap-2 overflow-x-auto pb-1 -mx-1 px-1 sm:mx-0 sm:px-0 sm:overflow-visible">
                    {emailTemplates.map((template) => (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => handleTemplateSelect(template.id)}
                        className={`text-left p-2.5 rounded-lg border transition-all shrink-0 sm:shrink min-w-[140px] sm:min-w-0 ${
                          selectedTemplate === template.id
                            ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                            : "border-border hover:border-primary/30 hover:bg-muted/30"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <FileText
                            className={`h-3.5 w-3.5 ${
                              selectedTemplate === template.id
                                ? "text-primary"
                                : "text-muted-foreground"
                            }`}
                          />
                          <span className="text-xs font-medium text-foreground truncate">
                            {template.name}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-1">
                          {template.subject}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Subject */}
                <div className="space-y-1.5">
                  <Label htmlFor="outreach-subject" className="text-xs">
                    Subject
                  </Label>
                  <Input
                    id="outreach-subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Enter email subject..."
                    className="text-sm"
                  />
                </div>

                {/* Body */}
                <div className="space-y-1.5">
                  <Label htmlFor="outreach-body" className="text-xs">
                    Message
                  </Label>
                  <Textarea
                    id="outreach-body"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Write your message..."
                    rows={6}
                    className="resize-none text-sm max-sm:rows-4"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      "{{candidateName}}",
                      "{{role}}",
                      "{{company}}",
                      "{{recruiterName}}",
                    ].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setBody((prev) => prev + v)}
                        className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-mono text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right — Preview */}
              {showPreview && (
                <div className="hidden md:flex md:w-[340px] border-l border-border bg-muted/20 p-4 flex-col">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                    <Eye className="h-3.5 w-3.5" />
                    Email Preview
                  </div>
                  <EmailPreview
                    subject={subject}
                    body={body}
                    recipientName={firstRecipient}
                  />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2 px-3 sm:px-5 py-3 border-t border-border bg-muted/20">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleClose(false)}
                disabled={sending}
                className="sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSend}
                disabled={sending || candidatesWithEmail.length === 0}
                className="sm:w-auto"
              >
                {sending ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-1.5 h-3.5 w-3.5" />
                    Send to {candidatesWithEmail.length} candidate
                    {candidatesWithEmail.length !== 1 ? "s" : ""}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
