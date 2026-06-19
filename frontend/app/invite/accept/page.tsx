import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { validateTeamInvite } from "@/app/common/services/team";
import { getCurrentUser } from "@/app/common/services/profile";
import AcceptInviteClient from "./_components/AcceptInviteClient";

type Props = {
  searchParams: Promise<{ token?: string }>;
};

export async function generateMetadata({
  searchParams,
}: Props): Promise<Metadata> {
  const { token } = await searchParams;
  if (!token) return { title: "Invalid Invite | TIAAGO" };

  const result = await validateTeamInvite(token);
  if (result.success) {
    return {
      title: `Join ${result.data.company} on TIAAGO`,
      description: `You have been invited to join ${result.data.company} as a ${result.data.role} on TIAAGO.`,
    };
  }
  return { title: "Team Invite | TIAAGO" };
}

function ErrorState({
  icon,
  iconBg,
  title,
  description,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
}) {
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
          <div
            className={`mx-auto w-16 h-16 rounded-full ${iconBg} flex items-center justify-center`}
          >
            {icon}
          </div>
          <h1 className="text-2xl font-semibold font-space-grotesk text-foreground">
            {title}
          </h1>
          <p className="text-muted-foreground text-sm">{description}</p>
          <Link href="/" className="btn btn-primary text-white w-full mt-4">
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default async function InviteAcceptPage({ searchParams }: Props) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <ErrorState
        iconBg="bg-error/10"
        icon={
          <svg
            className="h-8 w-8 text-error"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        }
        title="Invalid Invite Link"
        description="No invite token was provided. Please use the link from your invitation email."
      />
    );
  }

  const result = await validateTeamInvite(token);

  if (!result.success) {
    return (
      <ErrorState
        iconBg="bg-error/10"
        icon={
          <svg
            className="h-8 w-8 text-error"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        }
        title="Invalid Invite Link"
        description="This invite link is not valid. It may have been revoked or the URL is incorrect. Please contact the person who invited you."
      />
    );
  }

  const invite = result.data;

  if (invite.status === "accepted") {
    return (
      <ErrorState
        iconBg="bg-success/10"
        icon={
          <svg
            className="h-8 w-8 text-success"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            />
          </svg>
        }
        title="Invite Already Accepted"
        description={`This invitation to join ${invite.company} has already been accepted. Log in to access the dashboard.`}
      />
    );
  }

  if (invite.is_expired) {
    return (
      <ErrorState
        iconBg="bg-warning/10"
        icon={
          <svg
            className="h-8 w-8 text-warning"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            />
          </svg>
        }
        title="Invite Expired"
        description="This invitation has expired. Please ask the person who invited you to send a new one."
      />
    );
  }

  const { currentUser } = await getCurrentUser(undefined, {
    allowNull: true,
  });

  return (
    <AcceptInviteClient
      token={token}
      companyName={invite.company}
      role={invite.role}
      email={invite.email}
      existingUser={invite.existing_user ?? false}
      currentUser={currentUser}
    />
  );
}
