import Link from "next/link";

import StatCard from "@/app/common/components/dashboard/StatCard";
import SearchBar from "@/app/common/components/SearchBar";
import ServerPagination from "@/app/common/components/ServerPagination";
import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import { getTalentNetworkOverview, getTalentNetworkMembers } from "@/app/common/services/talent-network-admin";
import { ROLE_CATEGORY_OPTIONS, COMMUNITY_OPTIONS, INDUSTRY_OPTIONS } from "@/app/common/constants/talent-network";
import MembersTable from "./_components/MembersTable";
import ExportCsvButton from "./_components/ExportCsvButton";

export const metadata = {
  title: "Talent Network",
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const TalentNetworkAdminPage = async ({ searchParams }: Props) => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const resolvedSearchParams = await searchParams;
  const page = resolvedSearchParams.page ? Number(resolvedSearchParams.page) : 1;
  const q = typeof resolvedSearchParams.q === "string" ? resolvedSearchParams.q : undefined;
  const role = typeof resolvedSearchParams.role === "string" ? resolvedSearchParams.role : undefined;
  const country = typeof resolvedSearchParams.country === "string" ? resolvedSearchParams.country : undefined;
  const community = typeof resolvedSearchParams.community === "string" ? resolvedSearchParams.community : undefined;
  const industry = typeof resolvedSearchParams.industry === "string" ? resolvedSearchParams.industry : undefined;
  const years_experience =
    typeof resolvedSearchParams.years_experience === "string" ? resolvedSearchParams.years_experience : undefined;

  const overviewRes = await getTalentNetworkOverview();
  if (!overviewRes.success) {
    errors.push({ title: "Error loading overview", message: overviewRes.error });
  }
  const overview = overviewRes.success ? overviewRes.data : null;

  const membersRes = await getTalentNetworkMembers({
    page,
    search: q,
    role,
    country,
    community,
    industry,
    years_experience,
  });
  if (!membersRes.success) {
    errors.push({ title: "Error loading members", message: membersRes.error });
  }
  const members = membersRes.success ? membersRes.data : null;

  return (
    <div>
      <DisplayErrorMessages errors={errors} />
      <div className="border-b w-full border-gray-200 pb-1 mb-8 flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1 font-space-grotesk">Talent Network</h1>
          <h4 className="text-gray-900 text-sm md:text-base">
            Professionals who opted in to receive matching job opportunities.
          </h4>
        </div>
        <Link href="/admin/talent-network/analytics" className="btn btn-sm btn-outline">
          View Analytics
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <StatCard label="Total Members" value={overview?.total_members} unavailableText="Unavailable" />
        <StatCard label="New This Week" value={overview?.new_this_week} unavailableText="Unavailable" />
        <StatCard label="Countries" value={overview?.countries} unavailableText="Unavailable" />
        <StatCard label="Email Subscribers" value={overview?.email_subscribers} unavailableText="Unavailable" />
        <StatCard
          label="Top Role"
          value={overview?.top_roles?.[0]?.role?.replaceAll("_", " ") || "—"}
          subText={overview?.top_roles?.[0] ? `${overview.top_roles[0].count} members` : undefined}
        />
        <StatCard
          label="Top Community"
          value={overview?.top_communities?.[0]?.community?.replaceAll("_", " ") || "—"}
          subText={overview?.top_communities?.[0] ? `${overview.top_communities[0].count} members` : undefined}
        />
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <h2 className="text-lg font-semibold font-space-grotesk">Recent Signups</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <SearchBar placeholder="Search name or email..." querySearch queryKey="q" className="w-56" />
          <FilterForm
            role={role}
            country={country}
            community={community}
            industry={industry}
            years_experience={years_experience}
          />
          <ExportCsvButton />
        </div>
      </div>

      <MembersTable data={members?.results || []} />
      {!!members && <ServerPagination pagedResource={members} searchParams={resolvedSearchParams} />}
    </div>
  );
};

const FilterForm = ({
  role,
  country,
  community,
  industry,
  years_experience,
}: {
  role?: string;
  country?: string;
  community?: string;
  industry?: string;
  years_experience?: string;
}) => (
  <form className="flex items-center gap-2 flex-wrap">
    <select name="role" defaultValue={role || ""} className="select select-bordered select-sm">
      <option value="">All roles</option>
      {ROLE_CATEGORY_OPTIONS.map(o => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
    <select name="community" defaultValue={community || ""} className="select select-bordered select-sm">
      <option value="">All communities</option>
      {COMMUNITY_OPTIONS.map(o => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
    <select name="industry" defaultValue={industry || ""} className="select select-bordered select-sm">
      <option value="">All industries</option>
      {INDUSTRY_OPTIONS.map(o => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
    <select name="years_experience" defaultValue={years_experience || ""} className="select select-bordered select-sm">
      <option value="">All experience</option>
      <option value="0-2">0-2 Years</option>
      <option value="2-5">2-5 Years</option>
      <option value="5-8">5-8 Years</option>
      <option value="8-12">8-12 Years</option>
      <option value="12+">12+ Years</option>
    </select>
    <input type="text" name="country" defaultValue={country || ""} placeholder="Country" className="input input-bordered input-sm w-28" />
    <button type="submit" className="btn btn-sm btn-primary text-white">
      Filter
    </button>
  </form>
);

export default TalentNetworkAdminPage;
