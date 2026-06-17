"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
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
  ShieldCheck,
  KeyRound,
} from "lucide-react";
import { Button } from "@/app/common/components/ui/button";
import {
  getSmtpConfig,
  saveSmtpConfig,
  verifySmtpConfig,
  deleteSmtpConfig,
  SmtpConfig,
} from "@/app/common/services/sourcing";

type WizardStep = "intro" | "2fa" | "app-password" | "enter-password" | "success";

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
    return () => { cancelled = true; };
  }, []);

  const handleSave = async () => {
    if (!appPassword.trim()) {
      toast.error("Please enter your App Password.");
      return;
    }

    setSaving(true);
    const result = await saveSmtpConfig({
      gmail_address: "", // backend will use company email or user email
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

  if (wizardOpen) {
    return (
      <div className="p-5 rounded-lg border border-gray-200">
        <div className="border-b border-outline pb-5 mb-6">
          <h2 className="text-gray-900 text-base font-bold">
            Connect Gmail for Outreach
          </h2>
          <p className="text-sm text-gray-500">
            Send emails to pipeline candidates directly from your Gmail account.
          </p>
        </div>

        {wizardStep === "intro" && (
          <div className="max-w-lg space-y-6">
            <div className="flex items-start gap-4 p-4 rounded-lg bg-primary/5 border border-primary/10">
              <Mail className="h-6 w-6 text-primary shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-sm">How it works</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  To send outreach emails from your Gmail, you need to create a
                  Gmail <strong>App Password</strong>. This is a special 16-character
                  password that lets TIAAGO send emails on your behalf — without
                  exposing your actual Google password.
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium text-sm">You&apos;ll need to:</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-3 text-sm">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-xs font-bold shrink-0">
                    1
                  </span>
                  Enable 2-Step Verification on your Google account
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-xs font-bold shrink-0">
                    2
                  </span>
                  Create an App Password in your Google settings
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-xs font-bold shrink-0">
                    3
                  </span>
                  Paste the App Password here — we&apos;ll test the connection
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => setWizardStep("2fa")}>
                Get Started
              </Button>
              <Button
                variant="ghost"
                onClick={() => setWizardOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {wizardStep === "2fa" && (
          <div className="max-w-lg space-y-6">
            <div className="flex items-start gap-4 p-4 rounded-lg bg-blue-50 border border-blue-100">
              <ShieldCheck className="h-6 w-6 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-sm">
                  Step 1: Enable 2-Step Verification
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  App Passwords require 2-Step Verification to be enabled on your
                  Google account. If you already have it enabled, skip to the next
                  step.
                </p>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <p>1. Go to your Google Account security settings</p>
              <p>2. Under &quot;How you sign in to Google&quot;, click <strong>2-Step Verification</strong></p>
              <p>3. Follow the prompts to enable it</p>
            </div>
            <a
              href="https://myaccount.google.com/signinoptions/two-step-verification"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
              Open Google 2-Step Verification
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <div className="flex gap-3 pt-2">
              <Button onClick={() => setWizardStep("app-password")}>
                I&apos;ve enabled 2FA — Next
              </Button>
              <Button
                variant="ghost"
                onClick={() => setWizardStep("intro")}
              >
                Back
              </Button>
            </div>
          </div>
        )}

        {wizardStep === "app-password" && (
          <div className="max-w-lg space-y-6">
            <div className="flex items-start gap-4 p-4 rounded-lg bg-amber-50 border border-amber-100">
              <KeyRound className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-sm">
                  Step 2: Create an App Password
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Create an App Password specifically for TIAAGO. Google will give
                  you a 16-character password — copy it, you&apos;ll paste it in
                  the next step.
                </p>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <p>1. Go to your Google App Passwords page</p>
              <p>2. Type <strong>TIAAGO</strong> as the app name</p>
              <p>3. Click <strong>Create</strong></p>
              <p>4. <strong>Copy the 16-character password</strong> that appears</p>
            </div>
            <a
              href="https://myaccount.google.com/apppasswords"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
              Open Google App Passwords
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <div className="flex gap-3 pt-2">
              <Button onClick={() => setWizardStep("enter-password")}>
                I&apos;ve copied the password — Next
              </Button>
              <Button
                variant="ghost"
                onClick={() => setWizardStep("2fa")}
              >
                Back
              </Button>
            </div>
          </div>
        )}

        {wizardStep === "enter-password" && (
          <div className="max-w-lg space-y-6">
            <div className="flex items-start gap-4 p-4 rounded-lg bg-green-50 border border-green-100">
              <Mail className="h-6 w-6 text-green-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-sm">
                  Step 3: Enter your App Password
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Paste the 16-character App Password below. We&apos;ll test the
                  SMTP connection to make sure it works.
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <label
                htmlFor="app-password"
                className="block text-sm font-medium"
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
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono tracking-widest pr-10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
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
              <p className="text-xs text-muted-foreground">
                Your password is encrypted before storage. We never see or store
                it in plain text.
              </p>
            </div>
            <div className="flex gap-3">
              <Button onClick={handleSave} disabled={saving || !appPassword.trim()}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing connection...
                  </>
                ) : (
                  "Connect Gmail"
                )}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setWizardStep("app-password")}
                disabled={saving}
              >
                Back
              </Button>
            </div>
          </div>
        )}

        {wizardStep === "success" && (
          <div className="max-w-lg space-y-6 text-center py-8">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Gmail Connected!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Your Gmail SMTP is set up and verified. You can now send outreach
                emails to your pipeline candidates.
              </p>
            </div>
            <Button onClick={() => setWizardOpen(false)}>
              Done
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-5 rounded-lg border border-gray-200">
      <div className="border-b border-outline pb-5">
        <h2 className="text-gray-900 text-base font-bold">
          Email Integration
        </h2>
        <p className="text-sm text-gray-500">
          Connect your Gmail to send outreach emails directly to pipeline candidates.
        </p>
      </div>

      <div className="mt-6 space-y-6">
        {config ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">{config.gmail_address}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {config.is_verified ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                        <span className="text-xs text-green-600">Verified</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3.5 w-3.5 text-destructive" />
                        <span className="text-xs text-destructive">
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
                  <span className="ml-1.5 hidden sm:inline">
                    {verifying ? "Testing..." : "Test"}
                  </span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-destructive hover:text-destructive"
                >
                  {deleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  <span className="ml-1.5 hidden sm:inline">Disconnect</span>
                </Button>
              </div>
            </div>

            {!config.is_verified && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
                Your SMTP connection is not verified. Your App Password may have
                been revoked. Please{" "}
                <button
                  onClick={resetWizard}
                  className="text-primary underline"
                >
                  set up a new one
                </button>
                .
              </div>
            )}

            <Button variant="outline" onClick={resetWizard}>
              Update App Password
            </Button>
          </div>
        ) : (
          <div className="text-center py-10 space-y-4">
            <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">No email connected</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                Connect your Gmail to send outreach emails to pipeline candidates
                directly from your own email address.
              </p>
            </div>
            <Button onClick={resetWizard}>Connect Gmail</Button>
          </div>
        )}
      </div>
    </div>
  );
}
