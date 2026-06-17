"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/common/components/ui/button";
import { Input } from "@/app/common/components/ui/input";
import { Label } from "@/app/common/components/ui/label";
import { Textarea } from "@/app/common/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/common/components/ui/select";
import {
  Sparkles,
  Users,
  Shield,
  Upload,
  Check,
  Loader2,
  FileText,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useUserStore } from "@/app/common/store/useUser";
import { submitInviteApplication } from "@/app/common/services/sourcing";

interface InviteApplicationFormProps {
  token: string;
  categoryName: string;
  companyName: string;
}

const EXPERIENCE_LEVELS = [
  "Entry Level",
  "Junior",
  "Mid Level",
  "Senior",
  "Lead / Staff",
  "Principal / Director",
];

const CURRENCIES = ["USD", "GBP", "EUR", "NGN", "KES", "ZAR", "GHS", "EGP"];

export function InviteApplicationForm({
  token,
  categoryName,
  companyName,
}: InviteApplicationFormProps) {
  const router = useRouter();
  const user = useUserStore(s => s.profile);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [experienceLevel, setExperienceLevel] = useState("");
  const [currency, setCurrency] = useState("USD");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error("File too large", {
        description: "Please upload a file smaller than 5MB.",
      });
      e.target.value = "";
      return;
    }

    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type", {
        description: "Please upload a PDF, DOC, or DOCX file.",
      });
      e.target.value = "";
      return;
    }

    setSelectedFile(file);
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!user) {
      toast.info("Please create an account first", {
        description:
          "You need an account to submit your application. You'll be redirected to sign up.",
      });
      router.push(`/talents/signup?next=/sourcing/invite/${token}`);
      return;
    }

    const form = e.currentTarget;
    const formData = new FormData();

    // Personal info
    formData.append(
      "first_name",
      (form.elements.namedItem("first_name") as HTMLInputElement).value
    );
    formData.append(
      "last_name",
      (form.elements.namedItem("last_name") as HTMLInputElement).value
    );
    formData.append(
      "email",
      (form.elements.namedItem("email") as HTMLInputElement).value
    );
    const phone = (form.elements.namedItem("phone") as HTMLInputElement).value;
    if (phone) formData.append("phone", phone);
    const linkedin = (form.elements.namedItem("linkedin") as HTMLInputElement)
      .value;
    if (linkedin) formData.append("linkedin_url", linkedin);
    const portfolio = (
      form.elements.namedItem("portfolio") as HTMLInputElement
    ).value;
    if (portfolio) formData.append("portfolio_url", portfolio);
    if (selectedFile) formData.append("resume", selectedFile);

    // Professional info
    const currentRole = (
      form.elements.namedItem("current_role") as HTMLInputElement
    ).value;
    if (currentRole) formData.append("current_role", currentRole);
    if (experienceLevel) formData.append("experience_level", experienceLevel);
    const location = (form.elements.namedItem("location") as HTMLInputElement)
      .value;
    if (location) formData.append("location", location);
    const salary = (form.elements.namedItem("current_pay") as HTMLInputElement)
      .value;
    if (salary) {
      formData.append("current_pay", salary);
      formData.append("pay_currency", currency);
    }
    const frameworks = (
      form.elements.namedItem("frameworks") as HTMLInputElement
    ).value;
    if (frameworks) formData.append("frameworks", frameworks);
    const summary = (
      form.elements.namedItem("summary") as HTMLTextAreaElement
    ).value;
    if (summary) formData.append("summary", summary);

    setIsSubmitting(true);
    try {
      const result = await submitInviteApplication(token, formData);
      if (result.success) {
        setIsSuccess(true);
      } else {
        toast.error("Submission failed", {
          description:
            result.error || "Something went wrong. Please try again.",
        });
      }
    } catch {
      toast.error("Submission failed", {
        description: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="mx-auto w-20 h-20 rounded-full bg-success/10 flex items-center justify-center">
            <Check className="h-10 w-10 text-success" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">
              Application Submitted!
            </h1>
            <p className="text-muted-foreground">
              You&apos;ve been added to {companyName}&apos;s {categoryName}{" "}
              pipeline. The recruiting team will review your profile and reach
              out when there&apos;s a match.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4 text-left space-y-2">
            <h3 className="font-medium text-sm text-foreground">
              What happens next?
            </h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-success mt-0.5 shrink-0" />
                Your profile is now visible to {companyName}&apos;s recruiting
                team
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-success mt-0.5 shrink-0" />
                You&apos;ll be notified when a role matches your profile
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-success mt-0.5 shrink-0" />
                Keep your TIAAGO profile updated for the best matches
              </li>
            </ul>
          </div>
          <Button
            onClick={() => router.push("/talents/dashboard")}
            className="w-full"
          >
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary/5 via-background to-primary/5 border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16 text-center space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            <Sparkles className="h-4 w-4" />
            Exclusive Invite
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
            Join {companyName}&apos;s {categoryName} Talent Network
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            You&apos;ve been invited to join an exclusive{" "}
            {categoryName.toLowerCase()} talent community. Get early access to
            opportunities and connect directly with the recruiting team.
          </p>

          {/* Feature Cards */}
          <div className="grid sm:grid-cols-3 gap-4 pt-4 max-w-2xl mx-auto">
            <div className="rounded-lg border border-border bg-card p-4 text-left space-y-2">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <h3 className="font-semibold text-sm text-foreground">
                Early Access
              </h3>
              <p className="text-xs text-muted-foreground">
                Hear about {companyName} roles before they&apos;re posted
                publicly.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 text-left space-y-2">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <h3 className="font-semibold text-sm text-foreground">
                Direct Connection
              </h3>
              <p className="text-xs text-muted-foreground">
                Connect directly with {companyName}&apos;s recruiting team.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 text-left space-y-2">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shield className="h-4 w-4 text-primary" />
              </div>
              <h3 className="font-semibold text-sm text-foreground">
                Privacy First
              </h3>
              <p className="text-xs text-muted-foreground">
                Your data is secure and shared only with your consent.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Form Section */}
      <div className="max-w-2xl mx-auto px-4 py-10 sm:py-14">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Personal Information */}
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                Personal Information
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Tell us a bit about yourself
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">
                  First Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="first_name"
                  name="first_name"
                  placeholder="John"
                  required
                  defaultValue={user?.first_name || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">
                  Last Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="last_name"
                  name="last_name"
                  placeholder="Doe"
                  required
                  defaultValue={user?.last_name || ""}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="john@example.com"
                required
                defaultValue={user?.email || ""}
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="+234 800 000 0000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="linkedin">LinkedIn Profile</Label>
                <Input
                  id="linkedin"
                  name="linkedin"
                  type="url"
                  placeholder="https://linkedin.com/in/johndoe"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="portfolio">Portfolio / Website</Label>
              <Input
                id="portfolio"
                name="portfolio"
                type="url"
                placeholder="https://johndoe.com"
              />
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label>CV / Resume</Label>
              <p className="text-xs text-muted-foreground">
                PDF, DOC, or DOCX (max 5MB)
              </p>
              {selectedFile ? (
                <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={removeFile}
                    className="p-1 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border hover:border-primary/50 bg-card hover:bg-primary/5 p-6 transition-colors cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Upload className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">
                      Click to upload your resume
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PDF, DOC, or DOCX up to 5MB
                    </p>
                  </div>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Professional Information */}
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                Professional Information
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Help the recruiting team understand your background
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="current_role">Current Role</Label>
                <Input
                  id="current_role"
                  name="current_role"
                  placeholder="e.g. Senior Software Engineer at Google"
                />
              </div>
              <div className="space-y-2">
                <Label>Applying For</Label>
                <Input
                  value={categoryName}
                  disabled
                  className="bg-secondary/50"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Experience Level</Label>
                <Select
                  value={experienceLevel}
                  onValueChange={setExperienceLevel}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPERIENCE_LEVELS.map(level => (
                      <SelectItem key={level} value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location / Country</Label>
                <Input
                  id="location"
                  name="location"
                  placeholder="e.g. Lagos, Nigeria"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="current_pay">Current Pay (Annual)</Label>
              <div className="flex gap-2">
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="w-24 shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map(c => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  id="current_pay"
                  name="current_pay"
                  type="number"
                  placeholder="e.g. 80000"
                  min="0"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="frameworks">Frameworks / Tools</Label>
              <Input
                id="frameworks"
                name="frameworks"
                placeholder="e.g. React, Node.js, Python, AWS (comma-separated)"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="summary">Professional Summary</Label>
              <Textarea
                id="summary"
                name="summary"
                placeholder="Briefly describe your experience, skills, and what you're looking for..."
                rows={4}
                className="resize-none"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>Join {companyName}&apos;s Talent Network</>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-3">
              By submitting, you agree to share your information with{" "}
              {companyName}&apos;s recruiting team through TIAAGO.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}