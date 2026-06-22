"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { ServerCandidate } from "@/app/common/types";
import { emailTemplates } from "@/app/common/constants/mockCandidates";
import {
  Dialog,
  DialogContent,
} from "@/app/common/components/ui/dialog";
import { Button } from "@/app/common/components/ui/button";
import { GoogleIcon } from "@/app/common/icons/GoogleIcon";
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
  Briefcase,
  Plus,
  Sparkles,
  MessageSquare,
  RefreshCw,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  sendOutreach,
  getSmtpConfig,
  saveSmtpConfig,
  SmtpConfig,
} from "@/app/common/services/sourcing";
import { getJobs } from "@/app/common/services/jobs";

type OutreachJob = { id: number; title: string; job_level?: string };

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

const TEMPLATE_ICONS = [Sparkles, MessageSquare, RefreshCw];

const PLACEHOLDER_GROUPS = [
  {
    label: "Candidate",
    items: ["{{candidateName}}", "{{role}}"],
  },
  {
    label: "Job",
    items: ["{{jobTitle}}", "{{jobLevel}}"],
  },
  {
    label: "Company",
    items: ["{{company}}", "{{recruiterName}}"],
  },
];

/* -- Inline Email Preview ---------------------------------------- */

function EmailPreview({
  subject,
  body,
  recipientName,
  selectedJob,
}: {
  subject: string;
  body: string;
  recipientName: string;
  selectedJob: OutreachJob | null;
}) {
  const jobTitle = selectedJob?.title || "Backend Engineer";
  const jobLevel = selectedJob?.job_level || "Senior";

  const previewBody = useMemo(() => {
    let text = body || "Your message will appear here...";
    text = text
      .replace(/\{\{candidateName\}\}/g, recipientName || "John")
      .replace(/\{\{company\}\}/g, "Your Company")
      .replace(/\{\{role\}\}/g, "Software Engineer")
      .replace(/\{\{recruiterName\}\}/g, "You")
      .replace(/\{\{jobTitle\}\}/g, jobTitle)
      .replace(/\{\{jobLevel\}\}/g, jobLevel);
    return text;
  }, [body, recipientName, jobTitle, jobLevel]);

  const previewSubject = useMemo(() => {
    let text = subject || "Email subject";
    text = text
      .replace(/\{\{company\}\}/g, "Your Company")
      .replace(/\{\{role\}\}/g, "Software Engineer")
      .replace(/\{\{jobTitle\}\}/g, jobTitle)
      .replace(/\{\{jobLevel\}\}/g, jobLevel);
    return text;
  }, [subject, jobTitle, jobLevel]);

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-[#EEF1FB] shadow-inner">
      <div
        className="px-5 py-3.5"
        style={{
          background: "linear-gradient(135deg, #1C3477, #5465FF)",
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-white/20 flex items-center justify-center">
              <Mail className="h-3 w-3 text-white" />
            </div>
            <span className="text-white/90 text-[10px] font-semibold tracking-wider uppercase">
              TIAAGO
            </span>
          </div>
          <span className="text-white/40 text-[10px]">Preview</span>
        </div>
      </div>

      <div className="bg-white mx-2.5 my-2.5 rounded-lg px-4 py-3.5 shadow-sm">
        <p className="text-xs font-semibold text-foreground mb-2.5 pb-2.5 border-b border-border/50">
          {previewSubject}
        </p>
        <div className="text-[11px] leading-relaxed text-muted-foreground whitespace-pre-line max-h-[200px] overflow-y-auto">
          {previewBody}
        </div>
      </div>

      <div className="px-4 py-2 flex items-center justify-between">
        <p className="text-[10px] text-muted-foreground/50">
          Sent via TIAAGO
        </p>
        {selectedJob && (
          <p className="text-[10px] text-primary/50 flex items-center gap-1">
            <Briefcase className="h-2.5 w-2.5" />
            {selectedJob.title}
          </p>
        )}
      </div>
    </div>
  );
}

/* -- Inline SMTP Setup Wizard ------------------------------------ */

function InlineSmtpWizard({
  onComplete,
  onCancel,
}: {
  onComplete: (config: SmtpConfig) => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState<SetupStep>("intro");
  const [gmailAddress, setGmailAddress] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!appPassword.trim() || !gmailAddress.trim()) return;
    setSaving(true);
    const result = await saveSmtpConfig({
      gmail_address: gmailAddress.trim(),
      app_password: appPassword.replace(/\s/g, ""),
    });
    setSaving(false);
    if (result.success) {
      toast.success("Gmail connected successfully!");
      onComplete(result.data);
    } else {
      toast.error(
        result.error || "Failed to connect. Check your credentials."
      );
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted/30">
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
          className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-col md:flex-row flex-1 min-h-0">
        <div className="hidden md:flex md:w-2/5 items-center justify-center p-8 bg-gradient-to-br from-primary/[0.03] to-primary/[0.07]">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <GoogleIcon className="h-10 w-10" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Gmail Integration</p>
              <p className="text-xs text-muted-foreground mt-1">Send emails from your Gmail</p>
            </div>
          </div>
        </div>

        <div className="flex-1 p-5 overflow-y-auto flex flex-col justify-center">
          {step === "intro" && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-foreground">
                  Enter your Gmail address
                </h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Outreach emails will be sent from this Gmail account.
                  You will need to create an App Password in the next step.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wizard-gmail" className="text-xs flex items-center gap-1.5">
                  <GoogleIcon className="h-4 w-4" />
                  Gmail Address
                </Label>
                <input
                  id="wizard-gmail"
                  type="email"
                  value={gmailAddress}
                  onChange={(e) => setGmailAddress(e.target.value)}
                  placeholder="your.email@gmail.com"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary focus-visible:outline-none"
                  autoComplete="email"
                />
              </div>
              <div className="flex gap-2.5 pt-2">
                <Button size="sm" onClick={() => setStep("app-password")} disabled={!gmailAddress.includes("@")}>
                  Continue
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="ghost" onClick={onCancel}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {step === "app-password" && (
            <div className="space-y-4">
              <div>
                <Badge variant="secondary" className="text-[10px] mb-2">
                  Step 1 of 2
                </Badge>
                <h4 className="font-semibold text-foreground">
                  Create an App Password
                </h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Sign in to your Google Account at the link below.
                  Name the App Password{" "}
                  <strong className="text-foreground">TIAAGO</strong>, then
                  copy the 16-character password Google generates.
                </p>
              </div>
              <a
                href="https://myaccount.google.com/apppasswords"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
              >
                <GoogleIcon className="h-4 w-4" />
                Open Google App Passwords
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                <p className="text-xs text-amber-800">
                  <strong>Note:</strong> If Google asks you to enable 2-Step Verification first, follow the
                  prompt to set it up, then come back to create the App Password.
                </p>
              </div>
              <div className="flex gap-2.5 pt-2">
                <Button size="sm" variant="ghost" onClick={() => setStep("intro")}>
                  <ArrowLeft className="mr-1 h-3.5 w-3.5" />
                  Back
                </Button>
                <Button size="sm" onClick={() => setStep("enter-password")}>
                  I&apos;ve copied the password
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}

          {step === "enter-password" && (
            <div className="space-y-4">
              <div>
                <Badge variant="secondary" className="text-[10px] mb-2">
                  Step 2 of 2
                </Badge>
                <h4 className="font-semibold text-foreground">
                  Paste your App Password
                </h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Paste the 16-character password from Google. We will verify the connection to{" "}
                  <strong className="text-foreground">{gmailAddress}</strong>.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wizard-app-password" className="text-xs flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                  App Password
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
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  Encrypted before storage
                </p>
              </div>
              <div className="flex gap-2.5 pt-2">
                <Button size="sm" variant="ghost" onClick={() => setStep("app-password")} disabled={saving}>
                  <ArrowLeft className="mr-1 h-3.5 w-3.5" />
                  Back
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving || !appPassword.trim()}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Connecting...
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

/* -- Main OutreachDialog ----------------------------------------- */

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
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [jobs, setJobs] = useState<OutreachJob[]>([]);

  const [smtpStatus, setSmtpStatus] = useState<
    "loading" | "not-configured" | "configured"
  >("loading");
  const [smtpConfig, setSmtpConfig] = useState<SmtpConfig | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    Promise.all([
      getSmtpConfig(),
      getJobs(1, 100).catch(() => ({ results: [] })),
    ]).then(([smtpResult, jobsResult]) => {
      if (cancelled) return;
      if (smtpResult.success && smtpResult.data?.is_verified) {
        setSmtpConfig(smtpResult.data);
        setSmtpStatus("configured");
      } else {
        setSmtpStatus("not-configured");
      }
      const jobsList = (jobsResult as any)?.results ?? [];
      setJobs(
        jobsList.map((j: any) => ({
          id: Number(j.id),
          title: j.title || j.role_title || "Untitled",
          job_level: j.job_level || "",
        }))
      );
    });
    return () => { cancelled = true; };
  }, [open]);

  const selectedJob = jobs.find(j => j.id === selectedJobId) || null;

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
    if (!selectedJobId) {
      toast.error("Please select a job opening.");
      return;
    }
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
      job_id: selectedJobId,
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
      setSelectedJobId(null);
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
      setSelectedJobId(null);
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
        {/* Loading */}
        {smtpStatus === "loading" && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">Loading outreach settings...</p>
          </div>
        )}

        {/* SMTP not configured */}
        {smtpStatus === "not-configured" && (
          <InlineSmtpWizard
            onComplete={handleSmtpSetupComplete}
            onCancel={() => onOpenChange(false)}
          />
        )}

        {/* Compose view */}
        {smtpStatus === "configured" && (
          <div className="flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-white">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10">
                  <Send className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">
                    Send Outreach
                  </h2>
                  <p className="text-[11px] text-muted-foreground">
                    via {smtpConfig?.gmail_address}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="hidden md:flex text-xs gap-1.5 h-8"
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                Preview
              </Button>
            </div>

            {/* Body */}
            <div className="flex flex-1 min-h-0 overflow-hidden">
              {/* Left: Compose */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                {/* Recipients */}
                <div className="rounded-xl bg-muted/30 border border-border/60 p-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <Users className="h-3.5 w-3.5" />
                    <span>
                      {candidatesWithEmail.length} recipient
                      {candidatesWithEmail.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {candidatesWithEmail.slice(0, 6).map((c, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center rounded-full bg-white border border-border px-2.5 py-0.5 text-[11px] font-medium text-foreground capitalize shadow-sm"
                      >
                        {c.name}
                      </span>
                    ))}
                    {candidatesWithEmail.length > 6 && (
                      <span className="inline-flex items-center rounded-full bg-primary/5 border border-primary/20 px-2.5 py-0.5 text-[11px] font-medium text-primary">
                        +{candidatesWithEmail.length - 6} more
                      </span>
                    )}
                  </div>
                  {candidatesWithoutEmail.length > 0 && (
                    <div className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-600">
                      <AlertCircle className="h-3 w-3" />
                      {candidatesWithoutEmail.length} skipped (no email)
                    </div>
                  )}
                </div>

                {/* Job Selection */}
                {jobs.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border p-6 text-center space-y-3">
                    <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mx-auto">
                      <Briefcase className="h-6 w-6 text-muted-foreground/50" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">No job postings yet</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Create a job posting first to start sending outreach
                      </p>
                    </div>
                    <Link
                      href="/startups/dashboard/jobs/create"
                      className="inline-flex items-center gap-1.5 btn btn-primary btn-sm"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Post a Job
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                      Job Opening <span className="text-error">*</span>
                    </Label>
                    <select
                      value={selectedJobId ?? ""}
                      onChange={(e) => setSelectedJobId(Number(e.target.value) || null)}
                      className="select select-bordered w-full text-sm h-10 rounded-lg"
                    >
                      <option value="" disabled>Select a job for this outreach...</option>
                      {jobs.map((job) => (
                        <option key={job.id} value={job.id}>
                          {job.title}{job.job_level ? ` (${job.job_level})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Templates */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Quick Templates</Label>
                  <div className="flex sm:grid sm:grid-cols-3 gap-2 overflow-x-auto pb-1 -mx-1 px-1 sm:mx-0 sm:px-0 sm:overflow-visible">
                    {emailTemplates.map((template, idx) => {
                      const Icon = TEMPLATE_ICONS[idx] || FileText;
                      const isSelected = selectedTemplate === template.id;
                      return (
                        <button
                          key={template.id}
                          type="button"
                          onClick={() => handleTemplateSelect(template.id)}
                          className={`text-left p-3 rounded-xl border transition-all shrink-0 sm:shrink min-w-[140px] sm:min-w-0 ${
                            isSelected
                              ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-sm"
                              : "border-border/60 hover:border-primary/30 hover:bg-muted/20"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1.5">
                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                              isSelected ? "bg-primary/10" : "bg-muted/50"
                            }`}>
                              <Icon className={`h-3 w-3 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                            </div>
                            <span className="text-xs font-medium text-foreground truncate">
                              {template.name}
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground line-clamp-1 pl-8">
                            {template.subject}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Subject */}
                <div className="space-y-1.5">
                  <Label htmlFor="outreach-subject" className="text-xs">Subject</Label>
                  <Input
                    id="outreach-subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Enter email subject..."
                    className="text-sm rounded-lg"
                  />
                </div>

                {/* Body */}
                <div className="space-y-2">
                  <Label htmlFor="outreach-body" className="text-xs">Message</Label>
                  <Textarea
                    id="outreach-body"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Write your message..."
                    rows={6}
                    className="resize-none text-sm max-sm:max-h-[120px] rounded-lg"
                  />
                  <div className="space-y-1.5">
                    {PLACEHOLDER_GROUPS.map((group) => (
                      <div key={group.label} className="flex items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground/60 w-16 shrink-0">
                          {group.label}
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {group.items.map((v) => (
                            <button
                              key={v}
                              type="button"
                              onClick={() => setBody((prev) => prev + v)}
                              className="rounded-md bg-muted/50 border border-border/40 px-2 py-0.5 text-[10px] font-mono text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/20 transition-colors"
                            >
                              {v}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: Preview */}
              {showPreview && (
                <div className="hidden md:flex md:w-[340px] border-l border-border bg-muted/10 p-4 flex-col">
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-3 font-medium">
                    <Eye className="h-3.5 w-3.5" />
                    Email Preview
                  </div>
                  <EmailPreview
                    subject={subject}
                    body={body}
                    recipientName={firstRecipient}
                    selectedJob={selectedJob}
                  />
                  {selectedJob && (
                    <div className="mt-3 rounded-lg bg-primary/5 border border-primary/10 p-2.5">
                      <p className="text-[10px] font-medium text-primary flex items-center gap-1.5">
                        <Briefcase className="h-3 w-3" />
                        Outreach for: {selectedJob.title}
                        {selectedJob.job_level ? ` (${selectedJob.job_level})` : ""}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2 px-4 sm:px-5 py-3 border-t border-border bg-muted/20">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleClose(false)}
                disabled={sending}
                className="sm:w-auto h-9"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSend}
                disabled={sending || candidatesWithEmail.length === 0 || !selectedJobId || jobs.length === 0}
                className="sm:w-auto h-9"
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
