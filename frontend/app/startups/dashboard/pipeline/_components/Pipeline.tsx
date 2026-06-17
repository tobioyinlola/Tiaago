"use client";
import { useState } from "react";
import { CandidateDetailPanel } from "./CandidateDetailPanel";
import { InviteDialog } from "./InviteDialog";
import { TalentPoolInviteDialog } from "./TalentPoolInviteDialog";
import { Button } from "@/app/common/components/ui/button";
import { Input } from "@/app/common/components/ui/input";
import { Badge } from "@/app/common/components/ui/badge";
import { Checkbox } from "@/app/common/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/common/components/ui/select";
import {
  Search,
  Users,
  Filter,
  UserPlus,
  Send,
  Briefcase,
  ArrowLeft,
  Download,
  Eye,
} from "lucide-react";
import { GetPipelineResponse, PipelineEntry } from "@/app/common/types";
import { toast } from "sonner";
import { OutreachDialog } from "../../sourcing/_components/OutreachDialog";
import { useRouter } from "next/navigation";
import { useAlert } from "@/app/common/store/useAlert";
import { deletePipelineEntry } from "@/app/common/services/sourcing";
import { handleFormSubmissionError } from "@/app/common/utils";
import { formatDistanceToNow } from "date-fns";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getInitials(name: string) {
  return name
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase();
}

function statusLabel(status: string) {
  switch (status) {
    case "not-interested":
      return "Not Interested";
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
}

function statusColor(status: string) {
  switch (status) {
    case "contacted":
      return "bg-[#EFF8FF] text-[#175CD3] border-[#B2DDFF]";
    case "interested":
      return "bg-[#ECFDF3] text-[#027A48] border-[#ABEFC6]";
    case "not-interested":
      return "bg-[#FEF3F2] text-[#B42318] border-[#FECDCA]";
    case "hired":
      return "bg-[#F0F0FF] text-primary border-primary/20";
    default:
      return "bg-[#F2F4F7] text-[#344054] border-[#E4E7EC]";
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function Pipeline({
  pipeline,
  categoryName,
  categoryId,
}: {
  pipeline: GetPipelineResponse | null;
  categoryName?: string;
  categoryId?: string;
}) {
  const [candidates, setCandidates] = useState<PipelineEntry[]>(
    pipeline?.entries || []
  );
  const router = useRouter();
  const setAlert = useAlert(s => s.setAlert);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Dialog / panel states
  const [detailCandidate, setDetailCandidate] =
    useState<PipelineEntry | null>(null);
  const [outreachCandidate, setOutreachCandidate] =
    useState<PipelineEntry | null>(null);
  const [inviteCandidate, setInviteCandidate] = useState<PipelineEntry | null>(
    null
  );
  const [showTalentPoolInvite, setShowTalentPoolInvite] = useState(false);
  const [showBulkOutreach, setShowBulkOutreach] = useState(false);

  // Get unique roles from candidates
  const uniqueRoles = Array.from(
    new Set(candidates.map(c => c.role).filter(Boolean))
  ).sort();

  const handleRemove = (candidate: PipelineEntry) => {
    setAlert({
      icon: "warning",
      title: "Are you sure?",
      message:
        "You are about to remove this candidate from your pipeline. This action cannot be undone.",
      buttonText: "Remove",
      buttonClassName: "btn btn-error",
      buttonAction: async () => {
        const res = await deletePipelineEntry(candidate.id);
        if (!res.success) {
          setTimeout(
            () => handleFormSubmissionError(res.error, undefined, setAlert),
            100
          );
          return;
        }
        const updated = candidates.filter(c => c.id !== candidate.id);
        setCandidates(updated);
        setSelectedIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(candidate.id.toString());
          return newSet;
        });
        if (detailCandidate?.id === candidate.id) {
          setDetailCandidate(null);
        }
        toast.success("Removed from Pipeline", {
          description: `${candidate.name} has been removed from your pipeline.`,
        });
      },
    });
  };

  const handleSendOutreach = (
    outreachCandidates: PipelineEntry[],
    subject: string,
    body: string
  ) => {
    console.log("Sending outreach:", {
      candidates: outreachCandidates,
      subject,
      body,
    });
    const updated = candidates.map(c =>
      outreachCandidates.find(oc => oc.id === c.id)
        ? { ...c, status: "contacted" as const }
        : c
    );
    setCandidates(updated);
    setSelectedIds(new Set());
  };

  const handleSelectCandidate = (candidateId: string, checked: boolean) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(candidateId);
      } else {
        newSet.delete(candidateId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredCandidates.map(c => c.id + "")));
    } else {
      setSelectedIds(new Set());
    }
  };

  // Filter candidates
  const filteredCandidates = candidates.filter(c => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.skills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    const matchesRole = roleFilter === "all" || c.role === roleFilter;

    return matchesSearch && matchesStatus && matchesRole;
  });

  const selectedCandidates = candidates.filter(c => selectedIds.has(c.id + ""));

  // Stats
  const stats = {
    total: candidates.length,
    new: candidates.filter(c => c.status === "new").length,
    contacted: candidates.filter(c => c.status === "contacted").length,
    interested: candidates.filter(c => c.status === "interested").length,
  };

  return (
    <>
      <div className='space-y-6'>
        {/* Page Header */}
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
          <div className='flex items-center gap-3'>
            <Button
              variant='ghost'
              size='icon'
              onClick={() => router.push("/startups/dashboard/pipeline")}
            >
              <ArrowLeft className='h-5 w-5' />
            </Button>
            <div>
              <h1 className='text-2xl font-bold text-foreground'>
                {categoryName || "Talent Pipeline"}
              </h1>
              <p className='text-muted-foreground'>
                Manage your sourced candidates and track their status
              </p>
            </div>
          </div>
          <div className='flex gap-2 sm:gap-3'>
            <Button
              variant='outline'
              size='sm'
              className='sm:size-default'
              onClick={() => {
                const csv = [
                  "Name,Email,Role,Status,Country,Skills",
                  ...candidates.map(c =>
                    [
                      c.name,
                      c.email || "",
                      c.role,
                      c.status,
                      c.country,
                      `"${(c.skills || []).join(", ")}"`,
                    ].join(",")
                  ),
                ].join("\n");
                const blob = new Blob([csv], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "pipeline-export.csv";
                a.click();
                URL.revokeObjectURL(url);
                toast.success("CSV exported");
              }}
              disabled={candidates.length === 0}
            >
              <Download className='h-4 w-4 sm:mr-2' />
              <span className='hidden sm:inline'>Export CSV</span>
            </Button>
            <Button
              variant='outline'
              size='sm'
              className='sm:size-default'
              onClick={() => setShowTalentPoolInvite(true)}
            >
              <UserPlus className='h-4 w-4 sm:mr-2' />
              <span className='hidden sm:inline'>Invite to Pool</span>
            </Button>
            <Button
              size='sm'
              className='sm:size-default'
              onClick={() => router.push("/startups/dashboard/sourcing")}
            >
              <Users className='h-4 w-4 sm:mr-2' />
              <span className='hidden sm:inline'>Source More</span>
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
          <div className='rounded-lg bg-card p-4 shadow-card'>
            <p className='text-sm text-muted-foreground'>Total in Pipeline</p>
            <p className='mt-1 text-2xl font-bold text-foreground'>
              {stats.total}
            </p>
          </div>
          <div className='rounded-lg bg-card p-4 shadow-card'>
            <p className='text-sm text-muted-foreground'>New</p>
            <p className='mt-1 text-2xl font-bold text-primary'>{stats.new}</p>
          </div>
          <div className='rounded-lg bg-card p-4 shadow-card'>
            <p className='text-sm text-muted-foreground'>Contacted</p>
            <p className='mt-1 text-2xl font-bold text-primary'>
              {stats.contacted}
            </p>
          </div>
          <div className='rounded-lg bg-card p-4 shadow-card'>
            <p className='text-sm text-muted-foreground'>Interested</p>
            <p className='mt-1 text-2xl font-bold text-success'>
              {stats.interested}
            </p>
          </div>
        </div>

        {/* Filters & Bulk Actions */}
        <div className='flex flex-col lg:flex-row lg:items-center justify-between gap-4'>
          <div className='flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 flex-1'>
            <div className='relative flex-1 sm:max-w-sm'>
              <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
              <Input
                placeholder='Search by name, role, or skills...'
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className='pl-10'
              />
            </div>

            <div className='flex gap-2 sm:gap-4'>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className='w-full sm:w-40'>
                  <Briefcase className='mr-2 h-4 w-4' />
                  <SelectValue placeholder='Role' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All Roles</SelectItem>
                  {uniqueRoles.map(role => (
                    <SelectItem key={role} value={role} className='capitalize'>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className='w-full sm:w-40'>
                  <Filter className='mr-2 h-4 w-4' />
                  <SelectValue placeholder='Status' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All Status</SelectItem>
                  <SelectItem value='new'>New</SelectItem>
                  <SelectItem value='contacted'>Contacted</SelectItem>
                  <SelectItem value='interested'>Interested</SelectItem>
                  <SelectItem value='not-interested'>Not Interested</SelectItem>
                  <SelectItem value='hired'>Hired</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Badge variant='secondary' className='hidden sm:flex'>
              {filteredCandidates.length} candidate
              {filteredCandidates.length !== 1 ? "s" : ""}
            </Badge>
          </div>

          {/* Bulk Actions */}
          {selectedIds.size > 0 && (
            <Button
              onClick={() => setShowBulkOutreach(true)}
              size='sm'
              className='sm:size-default'
            >
              <Send className='h-4 w-4 sm:mr-2' />
              <span className='hidden sm:inline'>Bulk Outreach</span> (
              {selectedIds.size})
            </Button>
          )}
        </div>

        {/* Pipeline Table */}
        {filteredCandidates.length > 0 ? (
          <div className='border border-t-0 rounded-b-lg overflow-x-auto'>
            <table className='table table-zebra w-full text-sm'>
              <thead className='bg-primary/5'>
                <tr>
                  <th className='w-10'>
                    <Checkbox
                      checked={
                        selectedIds.size === filteredCandidates.length &&
                        filteredCandidates.length > 0
                      }
                      onCheckedChange={handleSelectAll}
                      aria-label='Select all candidates'
                    />
                  </th>
                  <th className='font-semibold text-foreground'>Candidate</th>
                  <th className='font-semibold text-foreground max-md:hidden'>Role</th>
                  <th className='font-semibold text-foreground max-lg:hidden'>Country</th>
                  <th className='font-semibold text-foreground max-sm:hidden'>Skills</th>
                  <th className='font-semibold text-foreground'>Status</th>
                  <th className='font-semibold text-foreground max-md:hidden'>Sourced</th>
                  <th className='w-10'></th>
                </tr>
              </thead>
              <tbody>
                {filteredCandidates.map(candidate => {
                  const sourcedDate = candidate.created_at
                    ? formatDistanceToNow(new Date(candidate.created_at), {
                        addSuffix: true,
                      })
                    : "Recently";

                  return (
                    <tr
                      key={candidate.id}
                      className='cursor-pointer hover'
                      onClick={() => setDetailCandidate(candidate)}
                    >
                      <td onClick={e => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(candidate.id + "")}
                          onCheckedChange={checked =>
                            handleSelectCandidate(
                              candidate.id + "",
                              !!checked
                            )
                          }
                          aria-label={`Select ${candidate.name}`}
                        />
                      </td>

                      {/* Candidate: avatar + name + email */}
                      <td>
                        <div className='flex items-center gap-3'>
                          <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-400/80 text-white text-xs font-bold'>
                            {getInitials(candidate.name)}
                          </div>
                          <div className='min-w-0'>
                            <p className='font-medium text-foreground truncate capitalize'>
                              {candidate.name}
                            </p>
                            <p className='text-xs text-muted-foreground truncate'>
                              {candidate.email || "—"}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className='max-md:hidden'>
                        <span className='capitalize'>
                          {candidate.role || "—"}
                        </span>
                      </td>

                      {/* Country */}
                      <td className='max-lg:hidden'>
                        <span className='capitalize'>
                          {candidate.country || "—"}
                        </span>
                      </td>

                      {/* Skills (first 3) */}
                      <td className='max-sm:hidden'>
                        <div className='flex flex-wrap gap-1'>
                          {candidate.skills.length > 0 ? (
                            <>
                              {candidate.skills.slice(0, 3).map(skill => (
                                <Badge
                                  key={skill}
                                  variant='secondary'
                                  className='text-xs'
                                >
                                  {skill}
                                </Badge>
                              ))}
                              {candidate.skills.length > 3 && (
                                <Badge variant='outline' className='text-xs'>
                                  +{candidate.skills.length - 3}
                                </Badge>
                              )}
                            </>
                          ) : (
                            <span className='text-muted-foreground'>—</span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        <span
                          className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusColor(candidate.status)}`}
                        >
                          {statusLabel(candidate.status)}
                        </span>
                      </td>

                      {/* Sourced date */}
                      <td className='max-md:hidden'>
                        <span className='text-xs text-muted-foreground whitespace-nowrap'>
                          {sourcedDate}
                        </span>
                      </td>

                      {/* View action */}
                      <td onClick={e => e.stopPropagation()}>
                        <button
                          type='button'
                          onClick={() => setDetailCandidate(candidate)}
                          className='inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors'
                          aria-label={`View details for ${candidate.name}`}
                        >
                          <Eye className='h-3.5 w-3.5' />
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : candidates.length === 0 ? (
          <div className='flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center'>
            <div className='rounded-full bg-primary/10 p-4'>
              <Users className='h-8 w-8 text-primary' />
            </div>
            <h3 className='mt-4 text-lg font-semibold'>
              Your Pipeline is Empty
            </h3>
            <p className='mt-1 max-w-sm text-sm text-muted-foreground'>
              Start sourcing candidates to build your talent pipeline
            </p>
            <Button
              className='mt-4'
              onClick={() => router.push("/startups/dashboard/sourcing")}
            >
              Start Sourcing
            </Button>
          </div>
        ) : (
          <div className='flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center'>
            <div className='rounded-full bg-secondary p-4'>
              <Search className='h-8 w-8 text-muted-foreground' />
            </div>
            <h3 className='mt-4 text-lg font-semibold'>No matches found</h3>
            <p className='mt-1 text-sm text-muted-foreground'>
              Try adjusting your search or filters
            </p>
          </div>
        )}
      </div>

      {/* Candidate Detail Panel (replaces CandidateProfileDialog) */}
      <CandidateDetailPanel
        candidate={detailCandidate}
        open={!!detailCandidate}
        onClose={() => setDetailCandidate(null)}
        onSendOutreach={candidate => {
          setDetailCandidate(null);
          setOutreachCandidate(candidate);
        }}
        onRemove={handleRemove}
      />

      {/* Single Outreach Dialog */}
      <OutreachDialog
        candidates={outreachCandidate ? [outreachCandidate] : []}
        open={!!outreachCandidate}
        onOpenChange={open => !open && setOutreachCandidate(null)}
        onSend={(candidates, subject, body) =>
          handleSendOutreach(candidates as PipelineEntry[], subject, body)
        }
      />

      {/* Bulk Outreach Dialog */}
      <OutreachDialog
        candidates={selectedCandidates}
        open={showBulkOutreach}
        onOpenChange={setShowBulkOutreach}
        onSend={(candidates, subject, body) =>
          handleSendOutreach(candidates as PipelineEntry[], subject, body)
        }
      />

      {/* Invite Dialog */}
      <InviteDialog
        candidate={inviteCandidate}
        open={!!inviteCandidate}
        onOpenChange={open => !open && setInviteCandidate(null)}
      />

      {/* Talent Pool Invite Dialog */}
      <TalentPoolInviteDialog
        open={showTalentPoolInvite}
        onOpenChange={setShowTalentPoolInvite}
        categoryId={categoryId || ""}
        categoryName={categoryName || "Talent Pipeline"}
      />
    </>
  );
}
