"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Users,
  FolderKanban,
  MoreVertical,
  Pencil,
  Trash2,
  Search,
  ChevronRight,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import { EmptyStateV3 } from "@/app/common/components/dashboard/EmptyState";
import { Button } from "@/app/common/components/ui/button";
import { Input } from "@/app/common/components/ui/input";
import { Badge } from "@/app/common/components/ui/badge";
import { Switch } from "@/app/common/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/common/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/common/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/app/common/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/app/common/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/common/components/ui/select";
import { PipelineCategory } from "@/app/common/types";
import {
  createCategory,
  updateCategory,
  deleteCategory,
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
  const [newRoleName, setNewRoleName] = useState("");
  const [creating, setCreating] = useState(false);

  const [editCategory, setEditCategory] = useState<PipelineCategory | null>(
    null
  );
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editRoleName, setEditRoleName] = useState("");
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<PipelineCategory | null>(
    null
  );
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const filteredCategories = useMemo(() => {
    return categories.filter(cat => {
      const matchesSearch =
        !searchQuery ||
        cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cat.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && cat.is_active) ||
        (statusFilter === "inactive" && !cat.is_active);
      return matchesSearch && matchesStatus;
    });
  }, [categories, searchQuery, statusFilter]);

  const activePipelines = categories.filter(c => c.is_active).length;

  const openEdit = (cat: PipelineCategory) => {
    setEditCategory(cat);
    setEditName(cat.name);
    setEditDescription(cat.description);
    setEditRoleName(cat.role_name || "");
  };

  const handleEdit = async () => {
    if (!editCategory || !editName.trim()) return;
    setSaving(true);
    const res = await updateCategory(editCategory.id, {
      name: editName.trim(),
      description: editDescription.trim(),
      role_name: editRoleName.trim(),
    });
    setSaving(false);
    if (res.success) {
      setCategories(prev =>
        prev.map(c => (c.id === editCategory.id ? res.data : c))
      );
      setEditCategory(null);
      toast.success("Pipeline updated");
    } else {
      toast.error("Failed to update", { description: res.error });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || deleteConfirmText !== "delete") return;
    setDeleting(true);
    const res = await deleteCategory(deleteTarget.id);
    setDeleting(false);
    if (res.success) {
      setCategories(prev => prev.filter(c => c.id !== deleteTarget.id));
      setDeleteTarget(null);
      setDeleteConfirmText("");
      toast.success("Pipeline deleted", {
        description: `"${deleteTarget.name}" has been deleted.`,
      });
    } else {
      toast.error("Failed to delete", { description: res.error });
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    const res = await createCategory(newName.trim(), newDescription.trim(), newRoleName.trim());
    setCreating(false);
    if (res.success) {
      setCategories(prev => [res.data, ...prev]);
      setShowCreate(false);
      setNewName("");
      setNewDescription("");
      setNewRoleName("");
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

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "MMM dd, yyyy");
    } catch {
      return "—";
    }
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-switzer font-semibold text-foreground">
              Pipeline Categories
            </h1>
            <p className="text-sm text-muted-foreground">
              Organize your talent pipelines by role or team
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Pipeline
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <Card className="p-3 sm:p-0">
            <CardHeader className="hidden sm:flex pb-2">
              <CardTitle className="text-sm font-medium">
                <FolderKanban className="size-4 text-muted-foreground" />
              </CardTitle>
              <CardDescription>Total Pipelines</CardDescription>
            </CardHeader>
            <CardContent className="p-0 sm:p-6 sm:pt-0">
              <p className="text-xs text-muted-foreground sm:hidden mb-1">
                Total Pipelines
              </p>
              <div className="font-space-grotesk text-2xl sm:text-4xl font-medium tabular-nums leading-none tracking-tight">
                {categories.length}
              </div>
            </CardContent>
          </Card>

          <Card className="p-3 sm:p-0">
            <CardHeader className="hidden sm:flex pb-2">
              <CardTitle className="text-sm font-medium">
                <Users className="size-4 text-muted-foreground" />
              </CardTitle>
              <CardDescription>Total Candidates</CardDescription>
            </CardHeader>
            <CardContent className="p-0 sm:p-6 sm:pt-0">
              <p className="text-xs text-muted-foreground sm:hidden mb-1">
                Total Candidates
              </p>
              <div className="font-space-grotesk text-2xl sm:text-4xl font-medium tabular-nums leading-none tracking-tight">
                {totalCandidates}
              </div>
            </CardContent>
          </Card>

          <Card className="p-3 sm:p-0">
            <CardHeader className="hidden sm:flex pb-2">
              <CardTitle className="text-sm font-medium">
                <FolderKanban className="size-4 text-badge-green-text" />
              </CardTitle>
              <CardDescription>Active Pipelines</CardDescription>
            </CardHeader>
            <CardContent className="p-0 sm:p-6 sm:pt-0">
              <p className="text-xs text-muted-foreground sm:hidden mb-1">
                Active Pipelines
              </p>
              <div className="font-space-grotesk text-2xl sm:text-4xl font-medium tabular-nums leading-none tracking-tight">
                {activePipelines}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* All Candidates Banner */}
        <button
          onClick={() => router.push("/recruiter/dashboard/pipeline/all")}
          aria-label="View all candidates across all pipelines"
          className="w-full rounded-xl bg-gradient-to-r from-primary/5 to-card border border-border p-4 sm:p-5 shadow-sm hover:shadow-card-hover transition-all text-left flex items-center gap-3 sm:gap-4 group"
        >
          <div className="rounded-full bg-primary/10 p-2.5 sm:p-3 shrink-0">
            <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm sm:text-base font-semibold text-foreground">
              All Candidates
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground max-sm:hidden">
              View all candidates across pipelines
            </p>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <span className="text-xs sm:text-sm font-medium text-primary">
              {totalCandidates}
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </button>

        {/* Pipeline List Card */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg font-semibold">Pipelines</CardTitle>
                <CardDescription>
                  {filteredCategories.length} of {categories.length} pipeline{categories.length !== 1 ? "s" : ""}
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search pipelines..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-9 w-full sm:w-[240px]"
                  />
                </div>
                <Select
                  value={statusFilter}
                  onValueChange={v => setStatusFilter(v as "all" | "active" | "inactive")}
                >
                  <SelectTrigger className="w-full sm:w-[130px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-0">
            {categories.length > 0 ? (
              filteredCategories.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Pipeline</TableHead>
                      <TableHead className="max-sm:hidden">Candidates</TableHead>
                      <TableHead className="max-sm:hidden">Created</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[50px]">
                        <span className="sr-only">Actions</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCategories.map(cat => (
                      <TableRow
                        key={cat.id}
                        className="cursor-pointer"
                        onClick={() =>
                          router.push(`/recruiter/dashboard/pipeline/${cat.id}`)
                        }
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex size-8 sm:size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                              <FolderKanban className="size-3.5 sm:size-4 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-foreground truncate text-sm sm:text-base">
                                  {cat.name}
                                </p>
                                {cat.role_name && (
                                  <Badge variant="outline" className="text-[10px] shrink-0 max-sm:hidden">
                                    {cat.role_name}
                                  </Badge>
                                )}
                              </div>
                              {cat.description && (
                                <p className="text-xs sm:text-sm text-muted-foreground truncate max-w-[180px] sm:max-w-[280px] max-sm:hidden">
                                  {cat.description}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground sm:hidden">
                                {cat.candidate_count} candidate{cat.candidate_count !== 1 ? "s" : ""}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="max-sm:hidden">
                          <div className="flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm tabular-nums">
                              {cat.candidate_count}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="max-sm:hidden">
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(cat.created_at)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div
                            className="flex items-center gap-2"
                            onClick={e => e.stopPropagation()}
                          >
                            <Badge
                              variant={cat.is_active ? "success" : "secondary"}
                              className="text-xs"
                            >
                              {cat.is_active ? "Active" : "Inactive"}
                            </Badge>
                            <Switch
                              checked={cat.is_active}
                              onCheckedChange={() => handleToggleActive(cat)}
                              aria-label={`Toggle ${cat.name} active status`}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div onClick={e => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  className="p-1.5 rounded-md hover:bg-accent text-muted-foreground"
                                  aria-label={`Actions for ${cat.name}`}
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEdit(cat)}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setDeleteTarget(cat);
                                    setDeleteConfirmText("");
                                  }}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyStateV3
                  text="No pipelines found"
                  subText="Try adjusting your search or filter"
                  className="py-12"
                />
              )
            ) : (
              <div className="flex flex-col items-center">
                <EmptyStateV3
                  text="No Pipelines Yet"
                  subText="Create your first pipeline to start organizing candidates by role or team"
                  className="pb-4"
                />
                <Button className="mb-12" onClick={() => setShowCreate(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Pipeline
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Pipeline Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Pipeline</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                placeholder="Frontend engineer pipeline"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Role</label>
              <Input
                placeholder="Frontend engineer"
                value={newRoleName}
                onChange={e => setNewRoleName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Input
                placeholder="This pipeline is for frontend engineers"
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!newName.trim() || !newRoleName.trim() || creating}
            >
              {creating ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Pipeline Dialog */}
      <Dialog
        open={!!editCategory}
        onOpenChange={open => !open && setEditCategory(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Pipeline</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                placeholder="Frontend engineer pipeline"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Role</label>
              <Input
                placeholder="Frontend engineer"
                value={editRoleName}
                onChange={e => setEditRoleName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Input
                placeholder="This pipeline is for frontend engineers"
                value={editDescription}
                onChange={e => setEditDescription(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCategory(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleEdit}
              disabled={!editName.trim() || saving}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Pipeline Confirmation Dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={open => {
          if (!open) {
            setDeleteTarget(null);
            setDeleteConfirmText("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Pipeline</DialogTitle>
            <DialogDescription>
              This will permanently delete{" "}
              <span className="font-semibold text-foreground">
                &ldquo;{deleteTarget?.name}&rdquo;
              </span>{" "}
              and remove all candidates from this pipeline. This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium">
              Type <span className="font-bold text-destructive">delete</span> to
              confirm
            </label>
            <Input
              placeholder="delete"
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              className="mt-1"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteTarget(null);
                setDeleteConfirmText("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteConfirmText !== "delete" || deleting}
            >
              {deleting ? "Deleting..." : "Delete Pipeline"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
