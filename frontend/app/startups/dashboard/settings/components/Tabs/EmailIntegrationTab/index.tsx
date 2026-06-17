"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import Image from "next/image";
import {
  Mail,
  CheckCircle2,
  XCircle,
  Loader2,
  Trash2,
  RefreshCw,
  ExternalLink,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Lock,
} from "lucide-react";
import { Button } from "@/app/common/components/ui/button";
import { Badge } from "@/app/common/components/ui/badge";
import {
  getSmtpConfig,
  saveSmtpConfig,
  verifySmtpConfig,
  deleteSmtpConfig,
  SmtpConfig,
} from "@/app/common/services/sourcing";

type WizardStep = "intro" | "2fa" | "app-password" | "enter-password" | "success";

const STEPS: { key: WizardStep; label: string }[] = [
  { key: "intro", label: "Overview" },
  { key: "2fa", label: "2-Step Verification" },
  { key: "app-password", label: "App Password" },
  { key: "enter-password", label: "Connect" },
];

const STEP_ILLUSTRATIONS: Record<WizardStep, string> = {
  intro: "/assets/illustrations/email-intro.svg",
  "2fa": "/assets/illustrations/two-factor-auth.svg",
  "app-password": "/assets/illustrations/app-password.svg",
  "enter-password": "/assets/illustrations/email-connect.svg",
  success: "/assets/illustrations/email-success.svg",
};

function StepIndicator({ current }: { current: WizardStep }) {
  const currentIdx = STEPS.findIndex((s) => s.key === current);
  if (currentIdx === -1) return null;

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      {STEPS.map((step, i) => {
        const isActive = i === currentIdx;
        const isCompleted = i < currentIdx;
        return (
          <div key={step.key} className="flex items-center gap-1.5 sm:gap-2">
            {i > 0 && (
              <div
                className={`h-px w-4 sm:w-8 transition-colors ${
                  isCompleted ? "bg-primary" : "bg-border"
                }`}
              />
            )}
            <div className="flex items-center gap-1.5">
              <div
                className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-primary text-white shadow-sm shadow-primary/30"
                    : isCompleted
                      ? "bg-primary text-white"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={`text-xs font-medium hidden sm:inline ${
                  isActive
                    ? "text-foreground"
                    : isCompleted
                      ? "text-primary"
                      : "text-muted-foreground"
                }`}
              >
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function EmailIntegrationTab() {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<SmtpConfig | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<WizardStep>("intro");
  const [appPassword, setAppPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getSmtpConfig().then((result) => {
      if (cancelled) return;
      if (result.success) setConfig(result.data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async () => {
    if (!appPassword.trim()) {
      toast.error("Please enter your App Password.");
      return;
    }
    setSaving(true);
    const result = await saveSmtpConfig({
      gmail_address: "",
      app_password: appPassword.replace(/\s/g, ""),
    });
    setSaving(false);
    if (result.success) {
      setConfig(result.data);
      setWizardStep("success");
      toast.success("Gmail SMTP connected successfully!");
    } else {
      toast.error(result.error || "Failed to connect. Check your App Password.");
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    const result = await verifySmtpConfig();
    setVerifying(false);
    if (result.success) {
      toast.success("SMTP connection verified!");
      const refreshed = await getSmtpConfig();
      if (refreshed.success) setConfig(refreshed.data);
    } else {
      toast.error(result.error || "Verification failed.");
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    const result = await deleteSmtpConfig();
    setDeleting(false);
    if (result.success) {
      setConfig(null);
      toast.success("Gmail SMTP disconnected.");
    } else {
      toast.error(result.error || "Failed to disconnect.");
    }
  };

  const resetWizard = () => {
    setWizardStep("intro");
    setAppPassword("");
    setShowPassword(false);
    setWizardOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  /* ── Wizard ────────────────────────────────────────────────────── */
  if (wizardOpen) {
    return (
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Header with step indicator */}
        <div className="border-b border-border px-5 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/30">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Connect Gmail for Outreach
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Set up SMTP to send emails from your own address
            </p>
          </div>
          {wizardStep !== "success" && <StepIndicator current={wizardStep} />}
        </div>

        {/* Success state — full-width centered */}
        {wizardStep === "success" ? (
          <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
            <div className="w-48 h-48 mb-6">
              <Image
                src={STEP_ILLUSTRATIONS.success}
                alt="Success"
                width={192}
                height={192}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-5 w-5 text-success" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              Gmail Connected!
            </h3>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-sm">
              Your Gmail SMTP is set up and verified. You can now send outreach
              emails to your pipeline candidates.
            </p>
            <Button className="mt-6" onClick={() => setWizardOpen(false)}>
              Done
            </Button>
          </div>
        ) : (
          /* Split layout for wizard steps */
          <div className="flex flex-col md:flex-row min-h-[400px]">
            {/* Left — Illustration panel */}
            <div className="hidden md:flex md:w-2/5 items-center justify-center p-8 bg-gradient-to-br from-primary/[0.04] to-primary/[0.08]">
              <Image
                src={STEP_ILLUSTRATIONS[wizardStep]}
                alt=""
                width={280}
                height={280}
                className="w-full max-w-[260px] h-auto object-contain opacity-90"
              />
            </div>

            {/* Right — Step content */}
            <div className="flex-1 p-5 sm:p-8 flex flex-col justify-center">
              {wizardStep === "intro" && (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      How it works
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      To send outreach emails from your Gmail, you&apos;ll create a
                      Gmail <strong className="text-foreground">App Password</strong>{" "}
                      — a special 16-character key that lets TIAAGO send on your
                      behalf without exposing your Google password.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {[
                      "Enable 2-Step Verification on your Google account",
                      "Create an App Password in your Google settings",
                      "Paste the App Password here — we'll test the connection",
                    ].map((text, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 text-primary text-xs font-bold shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <p className="text-sm text-muted-foreground pt-1">{text}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                    <Lock className="h-3.5 w-3.5 shrink-0" />
                    Your password is encrypted at rest. We never store it in plain
                    text.
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button onClick={() => setWizardStep("2fa")}>
                      Get Started
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    <Button variant="ghost" onClick={() => setWizardOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {wizardStep === "2fa" && (
                <div className="space-y-5">
                  <div>
                    <Badge variant="secondary" className="mb-2 text-xs">
                      Step 1 of 3
                    </Badge>
                    <h3 className="text-lg font-semibold text-foreground">
                      Enable 2-Step Verification
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      App Passwords require 2-Step Verification. If you already
                      have it enabled, skip to the next step.
                    </p>
                  </div>

                  <div className="space-y-2.5 text-sm text-muted-foreground">
                    <p>
                      1. Go to your{" "}
                      <strong className="text-foreground">
                        Google Account security settings
                      </strong>
                    </p>
                    <p>
                      2. Under &quot;How you sign in to Google&quot;, click{" "}
                      <strong className="text-foreground">
                        2-Step Verification
                      </strong>
                    </p>
                    <p>3. Follow the prompts to enable it</p>
                  </div>

                  <a
                    href="https://myaccount.google.com/signinoptions/two-step-verification"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    Open Google 2-Step Verification
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>

                  <div className="flex gap-3 pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setWizardStep("intro")}
                    >
                      <ArrowLeft className="mr-1.5 h-4 w-4" />
                      Back
                    </Button>
                    <Button onClick={() => setWizardStep("app-password")}>
                      I&apos;ve enabled 2FA
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {wizardStep === "app-password" && (
                <div className="space-y-5">
                  <div>
                    <Badge variant="secondary" className="mb-2 text-xs">
                      Step 2 of 3
                    </Badge>
                    <h3 className="text-lg font-semibold text-foreground">
                      Create an App Password
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Create an App Password specifically for TIAAGO. Google will
                      give you a 16-character password — copy it for the next step.
                    </p>
                  </div>

                  <div className="space-y-2.5 text-sm text-muted-foreground">
                    <p>1. Go to your Google App Passwords page</p>
                    <p>
                      2. Type{" "}
                      <strong className="text-foreground">TIAAGO</strong> as
                      the app name
                    </p>
                    <p>
                      3. Click{" "}
                      <strong className="text-foreground">Create</strong>
                    </p>
                    <p>
                      4.{" "}
                      <strong className="text-foreground">
                        Copy the 16-character password
                      </strong>{" "}
                      that appears
                    </p>
                  </div>

                  <a
                    href="https://myaccount.google.com/apppasswords"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    Open Google App Passwords
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>

                  <div className="flex gap-3 pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setWizardStep("2fa")}
                    >
                      <ArrowLeft className="mr-1.5 h-4 w-4" />
                      Back
                    </Button>
                    <Button onClick={() => setWizardStep("enter-password")}>
                      I&apos;ve copied it
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {wizardStep === "enter-password" && (
                <div className="space-y-5">
                  <div>
                    <Badge variant="secondary" className="mb-2 text-xs">
                      Step 3 of 3
                    </Badge>
                    <h3 className="text-lg font-semibold text-foreground">
                      Enter your App Password
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Paste the 16-character App Password below. We&apos;ll test
                      the SMTP connection to make sure it works.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="app-password"
                      className="block text-sm font-medium text-foreground"
                    >
                      Gmail App Password
                    </label>
                    <div className="relative">
                      <input
                        id="app-password"
                        type={showPassword ? "text" : "password"}
                        value={appPassword}
                        onChange={(e) => setAppPassword(e.target.value)}
                        placeholder="xxxx xxxx xxxx xxxx"
                        className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm font-mono tracking-widest pr-10 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary focus-visible:outline-none transition-colors"
                        autoComplete="off"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Lock className="h-3 w-3" />
                      Encrypted before storage — never stored in plain text
                    </p>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setWizardStep("app-password")}
                      disabled={saving}
                    >
                      <ArrowLeft className="mr-1.5 h-4 w-4" />
                      Back
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={saving || !appPassword.trim()}
                    >
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Testing connection...
                        </>
                      ) : (
                        <>
                          Connect Gmail
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ── Connected / Empty states ──────────────────────────────────── */
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="border-b border-border px-5 sm:px-6 py-4 bg-muted/30">
        <h2 className="text-base font-semibold text-foreground">
          Email Integration
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Connect your Gmail to send outreach emails directly to pipeline
          candidates.
        </p>
      </div>

      <div className="p-5 sm:p-6">
        {config ? (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm text-foreground">
                    {config.gmail_address}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {config.is_verified ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                        <span className="text-xs text-success font-medium">
                          Verified
                        </span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3.5 w-3.5 text-destructive" />
                        <span className="text-xs text-destructive font-medium">
                          Not verified
                        </span>
                      </>
                    )}
                    {config.last_used_at && (
                      <span className="text-xs text-muted-foreground ml-2">
                        Last used:{" "}
                        {new Date(config.last_used_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleVerify}
                  disabled={verifying}
                >
                  {verifying ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  <span className="ml-1.5">
                    {verifying ? "Testing..." : "Test"}
                  </span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-destructive hover:text-destructive hover:bg-destructive/5"
                >
                  {deleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  <span className="ml-1.5">Disconnect</span>
                </Button>
              </div>
            </div>

            {!config.is_verified && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-warning/10 border border-warning/20 text-sm text-warning-foreground">
                <XCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                <p>
                  Your SMTP connection is not verified. Your App Password may have
                  been revoked.{" "}
                  <button
                    onClick={resetWizard}
                    className="text-primary font-medium hover:underline"
                  >
                    Set up a new one
                  </button>
                  .
                </p>
              </div>
            )}

            <Button variant="outline" size="sm" onClick={resetWizard}>
              Update App Password
            </Button>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row items-center gap-8 py-6">
            <div className="w-40 h-40 shrink-0">
              <Image
                src={STEP_ILLUSTRATIONS.intro}
                alt="Email integration"
                width={160}
                height={160}
                className="w-full h-full object-contain opacity-80"
              />
            </div>
            <div className="text-center md:text-left space-y-3">
              <h3 className="font-semibold text-foreground">
                No email connected
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Connect your Gmail to send outreach emails to pipeline
                candidates directly from your own email address.
              </p>
              <Button onClick={resetWizard}>
                <Mail className="mr-2 h-4 w-4" />
                Connect Gmail
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
