"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Users, FolderKanban } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/app/common/components/ui/button";
import { Input } from "@/app/common/components/ui/input";
import { Switch } from "@/app/common/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/app/common/components/ui/dialog";
import { PipelineCategory } from "@/app/common/types";
import {
  createCategory,
  updateCategory,
} from "@/app/common/services/sourcing";

export default function PipelineCategories({
  categories: initialCategories,
  totalCandidates,
}: {
  categories: PipelineCategory[];
  totalCandidates: number;
}) {
  const router = useRouter();
  const [categories, setCategories] =
    useState<PipelineCategory[]>(initialCategories);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    const res = await createCategory(newName.trim(), newDescription.trim());
    setCreating(false);
    if (res.success) {
      setCategories(prev => [res.data, ...prev]);
      setShowCreate(false);
      setNewName("");
      setNewDescription("");
      toast.success("Pipeline created", {
        description: `"${res.data.name}" has been created.`,
      });
    } else {
      toast.error("Failed to create pipeline", { description: res.error });
    }
  };

  const handleToggleActive = async (cat: PipelineCategory) => {
    const res = await updateCategory(cat.id, { is_active: !cat.is_active });
    if (res.success) {
      setCategories(prev =>
        prev.map(c => (c.id === cat.id ? res.data : c))
      );
    } else {
      toast.error("Failed to update", { description: res.error });
    }
  };

  return (
    <>
      <div className='space-y-6'>
        {/* Header */}
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
          <div>
            <h1 className='text-2xl font-bold text-foreground'>
              Pipeline Categories
            </h1>
            <p className='text-muted-foreground'>
              Organize your talent pipelines by role or team
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className='h-4 w-4 mr-2' />
            Create Pipeline
          </Button>
        </div>

        {/* Stats */}
        <div className='grid grid-cols-2 gap-4 max-w-md'>
          <div className='rounded-lg bg-card p-4 shadow-card'>
            <p className='text-sm text-muted-foreground'>Total Pipelines</p>
            <p className='mt-1 text-2xl font-bold text-foreground'>
              {categories.length}
            </p>
          </div>
          <div className='rounded-lg bg-card p-4 shadow-card'>
            <p className='text-sm text-muted-foreground'>Total Candidates</p>
            <p className='mt-1 text-2xl font-bold text-foreground'>
              {totalCandidates}
            </p>
          </div>
        </div>

        {/* All Candidates Card */}
        <button
          onClick={() => router.push("/startups/dashboard/pipeline/all")}
          className='w-full rounded-lg bg-card p-5 shadow-card border border-border hover:border-primary/30 transition-colors text-left flex items-center gap-4'
        >
          <div className='rounded-full bg-primary/10 p-3'>
            <Users className='h-6 w-6 text-primary' />
          </div>
          <div className='flex-1'>
            <h3 className='text-lg font-semibold'>All Candidates</h3>
            <p className='text-sm text-muted-foreground'>
              View all candidates across pipelines
            </p>
          </div>
          <span className='text-sm font-medium text-primary'>
            {totalCandidates} candidate{totalCandidates !== 1 ? "s" : ""}
          </span>
          <span className='text-muted-foreground'>›</span>
        </button>

        {/* Category Cards */}
        {categories.length > 0 ? (
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
            {categories.map(cat => (
              <div
                key={cat.id}
                className='rounded-lg bg-card p-5 shadow-card border border-border hover:border-primary/30 transition-colors'
              >
                <div className='flex items-start justify-between mb-3'>
                  <button
                    onClick={() =>
                      router.push(`/startups/dashboard/pipeline/${cat.id}`)
                    }
                    className='flex items-center gap-3 text-left'
                  >
                    <div className='rounded-lg bg-primary/10 p-2'>
                      <FolderKanban className='h-5 w-5 text-primary' />
                    </div>
                    <div>
                      <h3 className='font-semibold text-foreground'>
                        {cat.name}
                      </h3>
                      {cat.description && (
                        <p className='text-sm text-muted-foreground line-clamp-1'>
                          {cat.description}
                        </p>
                      )}
                    </div>
                  </button>
                </div>
                <div className='flex items-center justify-between pt-3 border-t border-border'>
                  <span className='text-sm text-muted-foreground'>
                    {cat.candidate_count} candidate
                    {cat.candidate_count !== 1 ? "s" : ""}
                  </span>
                  <div className='flex items-center gap-2'>
                    <span className='text-xs text-muted-foreground'>
                      {cat.is_active ? "Active" : "Inactive"}
                    </span>
                    <Switch
                      checked={cat.is_active}
                      onCheckedChange={() => handleToggleActive(cat)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className='flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center'>
            <div className='rounded-full bg-primary/10 p-4'>
              <FolderKanban className='h-8 w-8 text-primary' />
            </div>
            <h3 className='mt-4 text-lg font-semibold'>No Pipelines Yet</h3>
            <p className='mt-1 max-w-sm text-sm text-muted-foreground'>
              Create your first pipeline to start organizing candidates by role
              or team
            </p>
            <Button className='mt-4' onClick={() => setShowCreate(true)}>
              <Plus className='h-4 w-4 mr-2' />
              Create Pipeline
            </Button>
          </div>
        )}
      </div>

      {/* Create Pipeline Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Pipeline</DialogTitle>
          </DialogHeader>
          <div className='space-y-4 py-4'>
            <div>
              <label className='text-sm font-medium'>Name</label>
              <Input
                placeholder='e.g., Frontend Engineers'
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className='mt-1'
              />
            </div>
            <div>
              <label className='text-sm font-medium'>Description</label>
              <Input
                placeholder='e.g., React, Vue, Angular specialists'
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
                className='mt-1'
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setShowCreate(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!newName.trim() || creating}
            >
              {creating ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
