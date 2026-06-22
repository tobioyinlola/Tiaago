"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { ServerCandidate } from "@/app/common/types";
import { emailTemplates } from "@/app/common/constants/mockCandidates";
import {
  Dialog,
  DialogContent,
  DialogTitle,
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
import { useUserStore } from "@/app/common/store/useUser";
import { GoogleOAuthProvider, useGoogleLogin } from "@react-oauth/google";
import { publicKyInstance } from "@/app/common/utils/client-ky.instance";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

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

/* -- Google Connect Button (for non-Gmail users) ---------------- */

function GoogleConnectButton({ onConnected }: { onConnected: (email: string) => void }) {
  const [loading, setLoading] = useState(false);

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      try {
        const data = await publicKyInstance
          .post("auth/google/", {
            json: {
              access_token: tokenResponse.access_token,
              user_type: "company",
            },
          })
          .json<any>();

        const resp = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        const userInfo = await resp.json();
        const gmail = userInfo.email || "";

        toast.success("Google account connected!");
        onConnected(gmail);
      } catch {
        toast.error("Failed to connect Google account. Please try again.");
        setLoading(false);
      }
    },
    onError: () => {
      toast.error("Google sign-in was cancelled.");
    },
  });

  return (
    <button
      type="button"
      onClick={() => login()}
      disabled={loading}
      className="flex items-center gap-3 border border-border w-full py-3 justify-center rounded-xl text-sm font-medium shadow-sm hover:bg-muted/30 transition-colors disabled:opacity-60"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <GoogleIcon className="h-5 w-5" />
      )}
      {loading ? "Connecting..." : "Connect with Google"}
    </button>
  );
}

/* -- Inline SMTP Setup Wizard ------------------------------------ */

type SmtpWizardStep = "connect-google" | "app-password" | "enter-password";

function InlineSmtpWizardInner({
  onComplete,
  onCancel,
}: {
  onComplete: (config: SmtpConfig) => void;
  onCancel: () => void;
}) {
  const profile = useUserStore(s => s.profile);
  const userEmail = (profile as any)?.user?.email || (profile as any)?.email || "";
  const isGmail = userEmail.endsWith("@gmail.com") || userEmail.endsWith("@googlemail.com");
  const authProvider = (profile as any)?.user?.auth_provider || (profile as any)?.auth_provider || "email";
  const hasGmail = isGmail || authProvider === "google";

  const [gmailAddress, setGmailAddress] = useState(hasGmail ? userEmail : "");
  const [step, setStep] = useState<SmtpWizardStep>(hasGmail ? "app-password" : "connect-google");
  const [appPassword, setAppPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleGoogleConnected = (email: string) => {
    setGmailAddress(email);
    setStep("app-password");
  };

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
      toast.error(result.error || "Failed to connect. Check your App Password.");
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
            {step === "connect-google"
              ? "Connect your Google account to get started"
              : `Sending from ${gmailAddress}`}
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
          {step === "connect-google" && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-foreground">
                  Connect your Google account
                </h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Sign in with Google to link your Gmail address.
                  Outreach emails will be sent from your Gmail.
                </p>
              </div>
              <GoogleConnectButton onConnected={handleGoogleConnected} />
              <p className="text-[11px] text-muted-foreground text-center flex items-center justify-center gap-1">
                <Lock className="h-3 w-3" />
                You can still log in with your current email and password
              </p>
              <div className="flex justify-center pt-1">
                <Button size="sm" variant="ghost" onClick={onCancel}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {step === "app-password" && (
            <div className="space-y-4">
              <div>
                {!hasGmail && (
                  <Badge variant="secondary" className="text-[10px] mb-2">
                    Step 2 of 2
                  </Badge>
                )}
                <h4 className="font-semibold text-foreground">
                  Create an App Password
                </h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Sign in to{" "}
                  <strong className="text-foreground">{gmailAddress}</strong>{" "}
                  at the link below. Name the App Password{" "}
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
                {!hasGmail && (
                  <Button size="sm" variant="ghost" onClick={() => setStep("connect-google")}>
                    <ArrowLeft className="mr-1 h-3.5 w-3.5" />
                    Back
                  </Button>
                )}
                {hasGmail && (
                  <Button size="sm" variant="ghost" onClick={onCancel}>
                    Cancel
                  </Button>
                )}
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
                <h4 className="font-semibold text-foreground">
                  Paste your App Password
                </h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Paste the 16-character password from Google.
                  We will verify the connection to{" "}
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

function InlineSmtpWizard(props: { onComplete: (config: SmtpConfig) => void; onCancel: () => void }) {
  if (!GOOGLE_CLIENT_ID) {
    return <InlineSmtpWizardInner {...props} />;
  }
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <InlineSmtpWizardInner {...props} />
    </GoogleOAuthProvider>
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
      getJobs(1, 100).catch((e) => { console.error("getJobs failed:", e); return { results: [] }; }),
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
        <DialogTitle className="sr-only">Send Outreach</DialogTitle>
        {/* Loading */}
        {smtpStatus === "loading" && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">Loading...</p>
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
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10">
                  <Send className="h-3.5 w-3.5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground leading-tight">Send Outreach</p>
                  <p className="text-[10px] text-muted-foreground">via {smtpConfig?.gmail_address}</p>
                </div>
              </div>
              <button
                type="button"
                className="hidden md:flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-muted transition-colors"
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                Preview
              </button>
            </div>

            {/* Body */}
            <div className="flex flex-1 min-h-0 overflow-hidden">
              {/* Left: Compose */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {/* Recipients */}
                <div className="flex items-start gap-2">
                  <span className="text-[11px] text-muted-foreground mt-1 shrink-0 w-8">To</span>
                  <div className="flex flex-wrap gap-1 flex-1">
                    {candidatesWithEmail.slice(0, 5).map((c, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center rounded-full bg-muted/50 px-2 py-0.5 text-[11px] font-medium text-foreground capitalize"
                      >
                        {c.name}
                      </span>
                    ))}
                    {candidatesWithEmail.length > 5 && (
                      <span className="inline-flex items-center rounded-full bg-primary/5 px-2 py-0.5 text-[11px] font-medium text-primary">
                        +{candidatesWithEmail.length - 5} more
                      </span>
                    )}
                    {candidatesWithoutEmail.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 px-2 py-0.5">
                        <AlertCircle className="h-2.5 w-2.5" />
                        {candidatesWithoutEmail.length} skipped
                      </span>
                    )}
                  </div>
                </div>

                {/* Job Selection */}
                {jobs.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                      <Briefcase className="h-4 w-4 text-muted-foreground/60" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">No job postings yet</p>
                      <p className="text-[11px] text-muted-foreground">Post a job to start sending outreach</p>
                    </div>
                    <Link
                      href="/startups/dashboard/jobs/create"
                      className="btn btn-primary btn-sm shrink-0"
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
            <div className="flex items-center justify-end gap-2 px-4 py-2.5 border-t border-border">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleClose(false)}
                disabled={sending}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSend}
                disabled={sending || candidatesWithEmail.length === 0 || !selectedJobId || jobs.length === 0}
                className="h-8 text-xs"
              >
                {sending ? (
                  <>
                    <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-1.5 h-3 w-3" />
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
