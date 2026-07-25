"use client";

import SlidePanel from "@/app/common/components/SlidePanel";
import StatusBadge from "@/app/common/components/StatusBadge";
import { TalentNetworkMember } from "@/app/common/services/talent-network-admin";

const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <p className="text-xs font-semibold uppercase tracking-wide text-secondary-black mb-1">{label}</p>
    <p className="text-sm text-primaryBlack">{value || "—"}</p>
  </div>
);

const MemberProfilePanel = ({ member, onClose }: { member: TalentNetworkMember; onClose: () => void }) => {
  return (
    <SlidePanel open={!!member} onClose={onClose} title={member.full_name} className="max-w-lg">
      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <StatusBadge status={member.status.toLowerCase() as any} />
          <span className="text-xs text-secondary-black">Joined {new Date(member.created_at).toLocaleDateString()}</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Email" value={member.email} />
          <Field label="Phone" value={member.phone} />
          <Field label="Job Title" value={member.job_title} />
          <Field label="Experience" value={member.years_experience} />
          <Field label="Location" value={[member.city, member.state, member.country].filter(Boolean).join(", ")} />
          <Field label="Preferred Work Type" value={member.preferred_work_type} />
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-secondary-black mb-2">Interested Roles</p>
          <div className="flex flex-wrap gap-1.5">
            {member.interested_roles.map(r => (
              <span key={r} className="text-xs font-medium px-2.5 py-1 rounded-full bg-[#F5F6F7] text-secondary-black">
                {r.replaceAll("_", " ")}
              </span>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-secondary-black mb-2">Industry</p>
          <div className="flex flex-wrap gap-1.5">
            {member.industry.map(i => (
              <span key={i} className="text-xs font-medium px-2.5 py-1 rounded-full bg-[#F5F6F7] text-secondary-black">
                {i}
              </span>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-secondary-black mb-2">Communities</p>
          <div className="flex flex-wrap gap-1.5">
            {member.communities.length ? (
              member.communities.map(c => (
                <span key={c} className="text-xs font-medium px-2.5 py-1 rounded-full bg-badge-blue-bg text-badge-blue-text">
                  {c.replaceAll("_", " ")}
                </span>
              ))
            ) : (
              <span className="text-sm text-secondary-black">—</span>
            )}
            {member.other_community && (
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-badge-blue-bg text-badge-blue-text">
                {member.other_community}
              </span>
            )}
          </div>
        </div>

        <Field label="Email Preference" value={member.email_frequency.replaceAll("_", " ")} />
        <Field label="Last Email Sent" value={member.last_email_sent ? new Date(member.last_email_sent).toLocaleString() : undefined} />
        <Field label="Last Opened" value={member.last_opened ? new Date(member.last_opened).toLocaleString() : undefined} />
      </div>
    </SlidePanel>
  );
};

export default MemberProfilePanel;
