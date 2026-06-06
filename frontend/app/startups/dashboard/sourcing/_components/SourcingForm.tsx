"use client";
import { useState } from "react";
import {
  X,
  Sparkles,
  Globe,
  Briefcase,
  FileText,
  Hash,
  Zap,
  Users,
  Layers,
  MessageSquare,
} from "lucide-react";
import {
  countries,
  experienceLevels,
  roleCategories,
} from "@/app/common/constants/mockCandidates";
import { SourcingSearchInput } from "@/app/common/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/common/components/ui/select";
import { Card, CardContent } from "@/app/common/components/ui/card";
import { Input } from "@/app/common/components/ui/input";
import { Label } from "@/app/common/components/ui/label";
import { Textarea } from "@/app/common/components/ui/textarea";
import { Badge } from "@/app/common/components/ui/badge";
import { Switch } from "@/app/common/components/ui/switch";
import { Button } from "@/app/common/components/ui/button";
import { cn } from "@/app/common/lib/utils";

interface SourcingFormProps {
  onSearch: (request: SourcingSearchInput) => void;
  isLoading: boolean;
}

export function SourcingForm({ onSearch, isLoading }: SourcingFormProps) {
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [selectedStacks, setSelectedStacks] = useState<string[]>([]);
  const [customRole, setCustomRole] = useState("");
  const [country, setCountry] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [yearsOfExperience, setYearsOfExperience] = useState<number>();
  const [candidateCount, setCandidateCount] = useState("10");

  const currentRoleCategory = roleCategories.find(r => r.name === selectedRole);

  const handleRoleSelect = (role: string) => {
    setSelectedRole(role);
    setSelectedStacks([]);
    setCustomRole("");
  };

  const handleStackToggle = (stack: string) => {
    if (selectedStacks.includes(stack)) {
      setSelectedStacks(selectedStacks.filter(s => s !== stack));
    } else {
      setSelectedStacks([...selectedStacks, stack]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    return;
    const roleToUse = customRole || selectedRole;

    onSearch({
      main_role:
        roleToUse === "Software Engineer"
          ? "engineering"
          : roleToUse.toLowerCase(),
      ...(country && { location: country }),
      specializations: selectedStacks,
      ...(experienceLevel && {
        experience_level: experienceLevel.toLowerCase(),
      }),
      years_of_experience: yearsOfExperience,
      number_of_candidates: parseInt(candidateCount) || 10,
    });
  };

  const getDisplayRole = () => {
    if (customRole) return customRole;
    if (selectedRole && selectedStacks.length > 0) {
      return `${selectedRole} (${selectedStacks.join(", ")})`;
    }
    return selectedRole || "Not selected";
  };

  return (
    <div className='space-y-6 animate-fade-in'>
      {/* Hero Section */}
      <div className='relative overflow-hidden rounded-2xl bg-primary p-8 text-primary-foreground'>
        <div className='absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary-foreground/5' />
        <div className='absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-primary-foreground/5' />
        <div className='relative'>
          <div className='flex items-center gap-3 mb-3'>
            <div className='flex h-12 w-12 items-center justify-center rounded-xl bg-primary-foreground/10 backdrop-blur'>
              <Sparkles className='h-6 w-6' />
            </div>
            <div>
              <h1 className='text-2xl font-bold'>AI-Powered Sourcing</h1>
              <p className='text-primary-foreground/80 text-sm'>
                Find the perfect candidates in seconds
              </p>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className='space-y-6'>
        {/* Role Selection */}
        <Card className='border-0 shadow-card overflow-hidden'>
          <div className='border-b border-border bg-muted/30 px-6 py-4'>
            <div className='flex items-center gap-2'>
              <Users className='h-5 w-5 text-primary' />
              <h2 className='font-semibold text-foreground'>
                Role <span className='text-red-400'>*</span>
              </h2>
            </div>
            <p className='text-sm text-muted-foreground mt-1'>
              Select the role you&apos;re hiring for
            </p>
          </div>
          <CardContent className='p-6'>
            {/* Role Grid */}
            <div className='grid grid-cols-2 gap-2 mb-4'>
              {roleCategories.map(role => (
                <button
                  key={role.name}
                  type='button'
                  onClick={() => handleRoleSelect(role.name)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border p-3 text-left text-sm font-medium transition-all",
                    selectedRole === role.name
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border bg-card text-foreground hover:border-primary/50 hover:bg-secondary/50"
                  )}
                >
                  <Briefcase className='h-4 w-4 shrink-0' />
                  <span className='truncate'>{role.name}</span>
                </button>
              ))}
            </div>

            {/* Stacks for selected role */}
            {currentRoleCategory?.hasStacks && currentRoleCategory.stacks && (
              <div className='mt-4 p-4 rounded-lg bg-secondary/30 border border-border'>
                <div className='flex items-center gap-2 mb-3'>
                  <Layers className='h-4 w-4 text-primary' />
                  <span className='text-sm font-medium text-foreground'>
                    Select specialization(s){" "}
                    <span className='text-red-400'>*</span>
                  </span>
                </div>
                <div className='flex flex-wrap gap-2'>
                  {currentRoleCategory.stacks.map(stack => (
                    <button
                      key={stack}
                      type='button'
                      onClick={() => handleStackToggle(stack)}
                      className={cn(
                        "rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                        selectedStacks.includes(stack)
                          ? "bg-primary text-primary-foreground"
                          : "bg-card border border-border hover:border-primary hover:bg-primary/5 text-foreground"
                      )}
                    >
                      {stack}
                      {selectedStacks.includes(stack) && (
                        <span className='ml-1'>✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Custom Role Input */}
            <div className='mt-4'>
              <Label className='text-xs text-muted-foreground mb-2 block'>
                Or enter a custom role
              </Label>
              <Input
                placeholder='e.g., AI Research Scientist'
                value={customRole}
                onChange={e => {
                  setCustomRole(e.target.value);
                  if (e.target.value) {
                    setSelectedRole("");
                    setSelectedStacks([]);
                  }
                }}
              />
            </div>

            {/* Selected Summary */}
            {(selectedRole || customRole) && (
              <div className='mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <span className='text-sm font-medium text-foreground'>
                      Selected:
                    </span>
                    <Badge variant='info'>{getDisplayRole()}</Badge>
                  </div>
                  <button
                    type='button'
                    onClick={() => {
                      setSelectedRole("");
                      setSelectedStacks([]);
                      setCustomRole("");
                    }}
                    className='text-xs text-muted-foreground hover:text-destructive'
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Location & Experience */}
        <Card className='border-0 shadow-card overflow-hidden'>
          <div className='border-b border-border bg-muted/30 px-6 py-4'>
            <div className='flex items-center gap-2'>
              <Globe className='h-5 w-5 text-primary' />
              <h2 className='font-semibold text-foreground'>
                Location & Experience
              </h2>
            </div>
          </div>
          <CardContent className='p-6'>
            <div className='grid sm:grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label className='flex items-center gap-2'>
                  <Globe className='h-4 w-4 text-muted-foreground' />
                  Country/Location
                </Label>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger>
                    <SelectValue placeholder='Any location' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='any'>Any location</SelectItem>
                    {countries.map(c => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-2'>
                <Label className='flex items-center gap-2'>
                  <Briefcase className='h-4 w-4 text-muted-foreground' />
                  Experience Level
                </Label>
                <Select
                  value={experienceLevel}
                  onValueChange={setExperienceLevel}
                >
                  <SelectTrigger>
                    <SelectValue placeholder='Any experience' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='any'>Any experience</SelectItem>
                    {experienceLevels.map(level => (
                      <SelectItem key={level} value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className='space-y-2 mt-8'>
              <Label className='flex items-center gap-2'>
                <Briefcase className='h-4 w-4 text-muted-foreground' />
                Years of Experience <span className='text-red-400'>*</span>
              </Label>
              <Input
                type='number'
                value={yearsOfExperience || ""}
                onChange={e => setYearsOfExperience(Number(e.target.value))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Number of Candidates */}
        <Card className='border-0 shadow-card overflow-hidden'>
          <div className='border-b border-border bg-muted/30 px-6 py-4'>
            <div className='flex items-center gap-2'>
              <Hash className='h-5 w-5 text-primary' />
              <h2 className='font-semibold text-foreground'>
                Number of Candidates <span className='text-red-400'>*</span>
              </h2>
            </div>
          </div>
          <CardContent className='p-6'>
            <div className='flex items-center gap-4'>
              <div className='flex gap-2'>
                {[5, 10, 15, 20, 25].map(num => (
                  <button
                    key={num}
                    type='button'
                    onClick={() => setCandidateCount(num.toString())}
                    className={cn(
                      "h-10 w-12 rounded-lg border text-sm font-medium transition-all",
                      candidateCount === num.toString()
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-foreground hover:border-primary"
                    )}
                  >
                    {num}
                  </button>
                ))}
              </div>
              <span className='text-sm text-muted-foreground'>or</span>
              <Input
                type='number'
                min='1'
                max='50'
                value={candidateCount}
                onChange={e => setCandidateCount(e.target.value)}
                className='flex-1'
              />
            </div>
          </CardContent>
        </Card>

        {/* Job Description (Optional) */}
        {/* <Card className='border-0 shadow-card overflow-hidden'>
          <div className='border-b border-border bg-muted/30 px-6 py-4'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                {useSimpleMode ? (
                  <MessageSquare className='h-5 w-5 text-primary' />
                ) : (
                  <FileText className='h-5 w-5 text-primary' />
                )}
                <h2 className='font-semibold text-foreground'>
                  {useSimpleMode ? "Quick Description" : "Job Description"}
                </h2>
              </div>
              <div className='flex items-center gap-3'>
                <Badge variant='secondary'>Optional</Badge>
                <div className='flex items-center gap-2'>
                  <Label
                    htmlFor='simple-mode'
                    className='text-xs text-muted-foreground cursor-pointer'
                  >
                    Simple
                  </Label>
                  <Switch
                    id='simple-mode'
                    checked={useSimpleMode}
                    onCheckedChange={setUseSimpleMode}
                  />
                </div>
              </div>
            </div>
            <p className='text-sm text-muted-foreground mt-1'>
              {useSimpleMode
                ? "Describe what you need in plain text"
                : "Paste the JD for better AI-powered matching"}
            </p>
          </div>
          <CardContent className='p-6'>
            {useSimpleMode ? (
              <Input
                placeholder='e.g., Product designer in London with 5 years of experience'
                value={simpleDescription}
                onChange={e => setSimpleDescription(e.target.value)}
              />
            ) : (
              <Textarea
                placeholder='Paste your job description here for more accurate candidate matching...'
                value={jobDescription}
                onChange={e => setJobDescription(e.target.value)}
                rows={5}
                className='resize-none'
              />
            )}
          </CardContent>
        </Card> */}

        {/* Submit Button */}
        <Button
          type='submit'
          size='lg'
          className='w-full h-14 text-base font-semibold shadow-lg hover:shadow-xl transition-all'
          disabled
          // disabled={
          //   isLoading ||
          //   (!selectedRole && !customRole) ||
          //   (yearsOfExperience || 0) < 1
          // }
        >
          Coming soon...
          {/* {isLoading ? (
            <>
              <div className='mr-3 h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent' />
              Finding Perfect Matches...
            </>
          ) : (
            <>
              <Zap className='mr-2 h-5 w-5' />
              Find {candidateCount} Candidates
            </>
          )} */}
        </Button>
      </form>
    </div>
  );
}
