"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Building2, Shield, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/app/common/components/ui/button";
import { Badge } from "@/app/common/components/ui/badge";
import { acceptTeamInvite } from "@/app/common/services/team";
import { TeamMemberRole, User } from "@/app/common/types";

interface AcceptInviteClientProps {
  token: string;
  companyName: string;
  role: TeamMemberRole;
  email: string;
  existingUser: boolean;
  currentUser: User | null;
}

const ROLE_LABELS: Record<TeamMemberRole, string> = {
  admin: "Admin",
  recruiter: "Recruiter",
  viewer: "Viewer",
};

const ROLE_DESCRIPTIONS: Record<TeamMemberRole, string> = {
  admin: "Full access to all features including team management and settings",
  recruiter: "Can post jobs, screen candidates, and manage applications",
  viewer: "Read-only access to the dashboard and candidate profiles",
};

function getDashboardUrl(role: TeamMemberRole): string {
  switch (role) {
    case "recruiter":
      return "/startups/dashboard/jobs";
    case "admin":
    case "viewer":
    default:
      return "/startups/dashboard";
  }
}

export default function AcceptInviteClient({
  token,
  companyName,
  role,
  email,
  existingUser,
  currentUser,
}: AcceptInviteClientProps) {
  const router = useRouter();
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const hasAutoAccepted = useRef(false);

  const isLoggedIn = !!currentUser;
  const emailMatches =
    isLoggedIn && currentUser.email.toLowerCase() === email.toLowerCase();

  const dashboardUrl = getDashboardUrl(role);

  const handleAccept = async () => {
    setAccepting(true);
    const result = await acceptTeamInvite(token);
    setAccepting(false);

    if (result.success) {
      setAccepted(true);
      toast.success("Invitation accepted!");
      // Auto-redirect after a brief moment so user sees success state
      setTimeout(() => {
        router.push(dashboardUrl);
      }, 1500);
    } else {
      toast.error("Failed to accept invitation", {
        description: result.error,
      });
    }
  };

  // Auto-accept when logged in and email matches
  useEffect(() => {
    if (isLoggedIn && emailMatches && !accepted && !accepting && !hasAutoAccepted.current) {
      hasAutoAccepted.current = true;
      handleAccept();
    }
  }, [isLoggedIn, emailMatches]); // eslint-disable-line react-hooks/exhaustive-deps

  const loginUrl = `/startups/signin?next=${encodeURIComponent(`/invite/accept?token=${token}`)}`;
  const signupUrl = `/startups/signup?next=${encodeURIComponent(`/invite/accept?token=${token}`)}&email=${encodeURIComponent(email)}`;

  if (accepted) {
    return (
      <div className="h-[100svh] w-[100svw] bg-white relative overflow-hidden">
        <Image
          src="/assets/images/Pricing Background pattern.png"
          alt=""
          className="object-cover"
          fill
        />
        <div className="relative flex items-center justify-center h-full px-4">
          <div className="max-w-md w-full text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <h1 className="text-2xl font-semibold font-space-grotesk text-foreground">
              Welcome to {companyName}!
            </h1>
            <p className="text-muted-foreground text-sm">
              You have joined as a {ROLE_LABELS[role]}. Redirecting to your dashboard...
            </p>
            <Button
              onClick={() => router.push(dashboardUrl)}
              className="w-full"
            >
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100svh] w-[100svw] bg-white relative overflow-hidden">
      <Image
        src="/assets/images/Pricing Background pattern.png"
        alt=""
        className="object-cover"
        fill
      />
      <div className="relative flex items-center justify-center h-full px-4">
        <div className="max-w-md w-full space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Building2 className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-2xl font-semibold font-space-grotesk text-foreground">
              Join {companyName}
            </h1>
            <p className="text-muted-foreground text-sm">
              You have been invited to join as a team member.
            </p>
          </div>

          {/* Invite details card */}
          <div className="bg-white border border-border rounded-lg p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Company</span>
              <span className="text-sm font-medium text-foreground">
                {companyName}
              </span>
            </div>
            <div className="border-t border-border" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Role</span>
              <Badge variant="purple">{ROLE_LABELS[role]}</Badge>
            </div>
            <div className="border-t border-border" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Email</span>
              <span className="text-sm font-medium text-foreground">
                {email}
              </span>
            </div>
            <div className="border-t border-border" />
            <div className="flex items-start gap-2 pt-1">
              <Shield className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                {ROLE_DESCRIPTIONS[role]}
              </p>
            </div>
          </div>

          {/* Actions */}
          {isLoggedIn && emailMatches ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Accepting invitation...</p>
            </div>
          ) : isLoggedIn && !emailMatches ? (
            <div className="space-y-3">
              <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
                <p className="text-sm text-foreground">
                  You are logged in as{" "}
                  <span className="font-medium">{currentUser.email}</span>, but
                  this invitation was sent to{" "}
                  <span className="font-medium">{email}</span>.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Please log out and sign in with the invited email address.
                </p>
              </div>
              <Link href={loginUrl}>
                <Button variant="outline" className="w-full">
                  Sign In with a Different Account
                </Button>
              </Link>
            </div>
          ) : existingUser ? (
            <div className="space-y-3">
              <p className="text-sm text-center text-muted-foreground">
                Sign in to accept this invitation.
              </p>
              <Link href={loginUrl}>
                <Button className="w-full" size="lg">
                  Sign In
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-center text-muted-foreground">
                Create an account to accept this invitation.
              </p>
              <Link href={signupUrl}>
                <Button className="w-full" size="lg">
                  Create Account
                </Button>
              </Link>
              <p className="text-xs text-center text-muted-foreground">
                Already have an account?{" "}
                <Link
                  href={loginUrl}
                  className="text-primary hover:underline font-medium"
                >
                  Sign in
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
