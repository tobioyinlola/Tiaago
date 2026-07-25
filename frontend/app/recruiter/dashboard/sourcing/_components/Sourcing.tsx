"use client";
import {
  Send,
  UserPlus,
  Check,
  LayoutGrid,
  List,
  Search,
  ArrowUpDown,
  Sparkles,
  Users,
  BadgeCheck,
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/common/components/ui/tabs";
import { cn, handleFormSubmissionError } from "@/app/common/utils";
import { Button } from "@/app/common/components/ui/button";
import {
  ID,
  ISearchParams,
  PagedResource,
  ServerCandidate,
  SourcingSearchInput,
  Talent,
  TalentRole,
} from "@/app/common/types";
import { SourcingForm } from "./SourcingForm";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/common/components/ui/select";
import { CandidateCard } from "./CandidateCard";
import { Badge } from "@/app/common/components/ui/badge";
import { VettedTalentsTab } from "./VettedTalentsTab";
import { CandidateProfileDialog } from "./CandidateProfileDialog";
import { OutreachDialog } from "./OutreachDialog";
import {
  addToPipeline,
  bulkAddToPipeline,
  sourcingSearch,
} from "@/app/common/services/sourcing";
import { useAlert } from "@/app/common/store/useAlert";

const Sourcing = ({
  talentsRes,
  roles,
  searchParams,
}: {
  talentsRes: PagedResource<Talent> | null;
  roles: TalentRole[];
  searchParams?: ISearchParams;
}) => {
  const setAlert = useAlert(s => s.setAlert);

  const [activeTab, setActiveTab] = useState("source");
  const [candidates, setCandidates] = useState<ServerCandidate[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<string>("score");
  const [isAddingToPipeline, setIsAddingToPipline] = useState(false);

  // Dialog states
  const [profileCandidate, setProfileCandidate] =
    useState<ServerCandidate | null>(null);
  const [profileCandidateId, setProfileCandidateId] = useState<string>();
  const [showOutreachDialog, setShowOutreachDialog] = useState(false);

  const selectedCandidates = candidates.filter((c, i) =>
    selectedIds.has(i.toString())
  );

  const handleSearch = async (request: SourcingSearchInput) => {
    setIsLoading(true);
    setHasSearched(true);
    setSelectedIds(new Set());

    const res = await sourcingSearch(request);
    if (res.success) {
      setCandidates(res.data);
      setIsLoading(false);

      toast.success("Search Complete", {
        description: `Found ${res.data.length} matching candidates.`,
      });
    } else {
      toast.error(res.error ?? "Search failed");
    }
  };

  const handleSelectCandidate = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === candidates.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(candidates.map((c, i) => i.toString())));
    }
  };

  const handleAddToPipeline = async (candidate: ServerCandidate) => {
    if (isAddingToPipeline) return;
    setIsAddingToPipline(true);
    toast.loading("Processing request...");
    const res = await addToPipeline(candidate);
    toast.dismiss();
    if (res.success) {
      toast.success("Added to Pipeline", {
        description: `${candidate.name} has been added to your pipeline.`,
      });
    } else {
      handleFormSubmissionError(res.error, undefined, setAlert);
    }
    setIsAddingToPipline(false);
  };

  const handleBulkAddToPipeline = async (candidates = selectedCandidates) => {
    if (isAddingToPipeline) return;
    setIsAddingToPipline(true);
    toast.loading("Processing request...");
    const res = await bulkAddToPipeline(candidates);
    toast.dismiss();
    if (res.success) {
      toast.success("Added to Pipeline", {
        description: `${candidates.length} candidates have been added to your pipeline.`,
      });
    } else {
      handleFormSubmissionError(res.error, undefined, setAlert);
    }
    setIsAddingToPipline(false);
  };

  const handleSendOutreach = (
    outreachCandidates: ServerCandidate[],
    subject: string,
    body: string
  ) => {
    console.log("Sending outreach:", {
      candidates: outreachCandidates,
      subject,
      body,
    });
  };

  const handleSort = (value: string) => {
    setSortBy(value);
    const sorted = [...candidates];
    switch (value) {
      case "score":
        // sorted.sort((a, b) => b.overallScore - a.overallScore);
        break;
      case "name":
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "experience":
        sorted.sort((a, b) => b.years_of_expr - a.years_of_expr);
        break;
    }
    setCandidates(sorted);
  };

  const onViewProfile = (candidate: ServerCandidate, index: number) => {
    setProfileCandidate(candidate);
    setProfileCandidateId(index.toString());
  };

  return (
    <>
      <Tabs value={activeTab} onValueChange={setActiveTab} className='w-full'>
        <TabsList className='mb-6'>
          <TabsTrigger value='source' className='gap-2'>
            <Search className='h-4 w-4' />
            Source Candidates
          </TabsTrigger>
          <TabsTrigger value='vetted' className='gap-2'>
            <BadgeCheck className='h-4 w-4' />
            Vetted Talents
          </TabsTrigger>
        </TabsList>

        <TabsContent value='source' className='mt-0'>
          <div className='flex flex-col lg:flex-row gap-6 lg:gap-8'>
            {/* Left Panel - Form */}
            <div className='w-full lg:w-[420px] lg:shrink-0'>
              <div className='lg:sticky lg:top-20'>
                <SourcingForm onSearch={handleSearch} isLoading={isLoading} />
              </div>
            </div>

            {/* Right Panel - Results */}
            <div className='flex-1 min-w-0'>
              {/* Results Header */}
              {hasSearched && !isLoading && candidates.length > 0 && (
                <div className='mb-6 animate-fade-in'>
                  {/* Stats Bar */}
                  <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4'>
                    <div className='flex items-center gap-3'>
                      <div className='flex items-center gap-2'>
                        <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-success/10'>
                          <Users className='h-5 w-5 text-success' />
                        </div>
                        <div>
                          <p className='text-2xl font-bold text-foreground'>
                            {candidates.length}
                          </p>
                          <p className='text-xs text-muted-foreground'>
                            Candidates Found
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className='flex items-center gap-3'>
                      {/* Sort */}
                      <Select value={sortBy} onValueChange={handleSort}>
                        <SelectTrigger className='w-32 sm:w-40 h-9'>
                          <ArrowUpDown className='mr-2 h-4 w-4' />
                          <SelectValue placeholder='Sort by' />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='score'>Match Score</SelectItem>
                          <SelectItem value='name'>Name</SelectItem>
                          <SelectItem value='experience'>Experience</SelectItem>
                        </SelectContent>
                      </Select>

                      {/* View Toggle */}
                      <div className='flex rounded-lg border border-border bg-card p-1'>
                        <button
                          onClick={() => setViewMode("grid")}
                          className={cn(
                            "rounded-md p-1.5 transition-all",
                            viewMode === "grid"
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <LayoutGrid className='h-4 w-4' />
                        </button>
                        <button
                          onClick={() => setViewMode("list")}
                          className={cn(
                            "rounded-md p-1.5 transition-all",
                            viewMode === "list"
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <List className='h-4 w-4' />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Selection Actions Bar */}
                  <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-card border border-border p-3 shadow-card'>
                    <div className='flex items-center gap-3'>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={handleSelectAll}
                        className='h-8'
                      >
                        {selectedIds.size === candidates.length ? (
                          <>
                            <Check className='mr-1.5 h-3.5 w-3.5' />
                            Deselect All
                          </>
                        ) : (
                          "Select All"
                        )}
                      </Button>
                      {selectedIds.size > 0 && (
                        <Badge variant='info' className='h-6'>
                          {selectedIds.size} selected
                        </Badge>
                      )}
                    </div>

                    {selectedIds.size > 0 && (
                      <div className='flex gap-2'>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => handleBulkAddToPipeline()}
                          className='h-8'
                        >
                          <UserPlus className='h-3.5 w-3.5 sm:mr-1.5' />
                          <span className='hidden sm:inline'>
                            Add to Pipeline
                          </span>
                        </Button>
                        <Button
                          size='sm'
                          onClick={() => setShowOutreachDialog(true)}
                          className='h-8'
                        >
                          <Send className='h-3.5 w-3.5 sm:mr-1.5' />
                          <span className='hidden sm:inline'>
                            Send Outreach
                          </span>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Loading State */}
              {isLoading && (
                <div className='space-y-4'>
                  <div className='flex items-center gap-3 mb-6'>
                    <div className='h-10 w-10 rounded-xl bg-primary/10 animate-pulse' />
                    <div className='space-y-2'>
                      <div className='h-6 w-32 rounded bg-muted animate-pulse' />
                      <div className='h-3 w-24 rounded bg-muted animate-pulse' />
                    </div>
                  </div>
                  <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-3'>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div
                        key={i}
                        className='h-[340px] rounded-xl bg-card border border-border shadow-card overflow-hidden'
                        style={{ animationDelay: `${i * 100}ms` }}
                      >
                        <div className='p-5 space-y-4'>
                          <div className='flex justify-between'>
                            <div className='h-5 w-5 rounded bg-muted animate-pulse' />
                            <div className='h-6 w-16 rounded-full bg-muted animate-pulse' />
                          </div>
                          <div className='flex gap-3'>
                            <div className='h-14 w-14 rounded-full bg-muted animate-pulse' />
                            <div className='space-y-2 flex-1'>
                              <div className='h-5 w-32 rounded bg-muted animate-pulse' />
                              <div className='h-4 w-24 rounded bg-muted animate-pulse' />
                            </div>
                          </div>
                        </div>
                        <div className='px-5 py-3 bg-muted/30 border-y border-border'>
                          <div className='h-4 w-40 rounded bg-muted animate-pulse' />
                        </div>
                        <div className='p-5 space-y-3'>
                          <div className='flex gap-2'>
                            <div className='h-6 w-16 rounded-full bg-muted animate-pulse' />
                            <div className='h-6 w-20 rounded-full bg-muted animate-pulse' />
                            <div className='h-6 w-14 rounded-full bg-muted animate-pulse' />
                          </div>
                          <div className='h-4 w-full rounded bg-muted animate-pulse' />
                          <div className='h-4 w-3/4 rounded bg-muted animate-pulse' />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Results Grid */}
              {!isLoading && candidates.length > 0 && (
                <div
                  className={cn(
                    "pr-0.5",
                    viewMode === "grid"
                      ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
                      : "space-y-3"
                  )}
                >
                  {candidates.map((candidate, index) => (
                    <div
                      key={index}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <CandidateCard
                        candidate={candidate}
                        isSelected={selectedIds.has(index.toString())}
                        onSelect={() => handleSelectCandidate(index + "")}
                        onViewProfile={() => onViewProfile(candidate, index)}
                        onAddToPipeline={handleAddToPipeline}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Empty State - After Search */}
              {!isLoading && hasSearched && candidates.length === 0 && (
                <div className='flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border py-20 text-center animate-fade-in'>
                  <div className='rounded-2xl bg-muted p-5 mb-4'>
                    <Search className='h-10 w-10 text-muted-foreground' />
                  </div>
                  <h3 className='text-xl font-semibold text-foreground'>
                    No candidates found
                  </h3>
                  <p className='mt-2 max-w-sm text-muted-foreground'>
                    Try adjusting your search criteria or expanding your skill
                    requirements
                  </p>
                </div>
              )}

              {/* Empty State - Before Search */}
              {!isLoading && !hasSearched && (
                <div className='flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 py-16 text-center animate-fade-in'>
                  <div className='rounded-2xl bg-primary/10 p-5 mb-4'>
                    <Sparkles className='h-10 w-10 text-primary' />
                  </div>
                  <h3 className='text-xl font-semibold text-foreground'>
                    Search Candidates
                  </h3>
                  <p className='mt-2 max-w-sm text-muted-foreground'>
                    Configure your search criteria on the left to discover
                    talent matching your requirements
                  </p>
                  <div className='mt-6 flex items-center gap-2 text-sm text-muted-foreground'>
                    <div className='h-2 w-2 rounded-full bg-success animate-pulse' />
                    AI-powered matching ready
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value='vetted' className='mt-0'>
          <VettedTalentsTab
            talentsRes={talentsRes}
            roles={roles}
            searchParams={searchParams}
          />
        </TabsContent>
      </Tabs>

      {/* Profile Dialog */}
      <CandidateProfileDialog
        candidate={profileCandidate}
        open={!!profileCandidate}
        onOpenChange={open => !open && setProfileCandidate(null)}
        onSendOutreach={candidate => {
          setProfileCandidate(null);
          setSelectedIds(new Set([profileCandidateId!]));
          setProfileCandidateId(undefined);
          setShowOutreachDialog(true);
        }}
        onAddToPipeline={handleAddToPipeline}
      />

      {/* Outreach Dialog */}
      <OutreachDialog
        candidates={selectedCandidates}
        open={showOutreachDialog}
        onOpenChange={setShowOutreachDialog}
        onSend={handleSendOutreach}
      />
    </>
  );
};

export default Sourcing;
