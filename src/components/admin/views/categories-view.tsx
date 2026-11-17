"use client";

import React, { useState, useMemo } from "react";
import { useRestaurant } from "@/lib/store/restaurant-store";
import { Category } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Plus,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

export function CategoriesView() {
  const {
    categories,
    menuItems,
    addCategory,
    updateCategory,
    deleteCategory,
    moveCategoryOrder,
  } = useRestaurant();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [displayOrder, setDisplayOrder] = useState("1");
  const [isSaving, setIsSaving] = useState(false);

  // Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Reordering loading state
  const [movingId, setMovingId] = useState<string | null>(null);

  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  }, [categories]);

  const handleOpenAdd = () => {
    setEditingCategory(null);
    setName("");
    setSlug("");
    setDescription("");
    setDisplayOrder(String(categories.length + 1));
    setModalOpen(true);
  };

  const handleOpenEdit = (category: Category) => {
    setEditingCategory(category);
    setName(category.name);
    setSlug(category.slug);
    setDescription(category.description || "");
    setDisplayOrder(String(category.displayOrder ?? 1));
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter a category name.");
      return;
    }

    const generatedSlug =
      slug.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    setIsSaving(true);
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, {
          name: name.trim(),
          slug: generatedSlug,
          description: description.trim() || undefined,
          displayOrder: Number(displayOrder) || 1,
        });
        toast.success(`Category "${name}" updated successfully.`);
      } else {
        await addCategory({
          name: name.trim(),
          slug: generatedSlug,
          description: description.trim() || undefined,
          displayOrder: Number(displayOrder) || sortedCategories.length + 1,
        });
        toast.success(`Category "${name}" created successfully.`);
      }
      setModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save category";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = (category: Category) => {
    setCategoryToDelete(category);
    setDeleteConfirmOpen(true);
  };

  const handleExecuteDelete = async () => {
    if (!categoryToDelete) return;
    setIsDeleting(true);
    try {
      await deleteCategory(categoryToDelete.id);
      toast.success(`Category "${categoryToDelete.name}" deleted.`);
      setDeleteConfirmOpen(false);
      setCategoryToDelete(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete category";
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMoveOrder = async (id: string, direction: "up" | "down") => {
    setMovingId(id);
    try {
      await moveCategoryOrder(id, direction);
      toast.success("Category order updated.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to move category";
      toast.error(msg);
    } finally {
      setMovingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-black text-foreground tracking-tight">
            Menu Categories ({categories.length})
          </h3>
          <p className="text-xs text-muted-foreground">
            Structure your digital menu into organized culinary sections with live customer updates.
          </p>
        </div>

        <Button
          onClick={handleOpenAdd}
          className="h-10 rounded-xl text-xs font-bold gap-2 shadow-xs"
        >
          <Plus className="h-4 w-4" />
          <span>Add Category</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {sortedCategories.map((cat, index) => {
          const itemCount = menuItems.filter((i) => i.categoryId === cat.id).length;
          const isMoving = movingId === cat.id;

          return (
            <div
              key={cat.id}
              className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-4 shadow-xs space-y-3 hover:border-primary/40 transition-all"
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                    Order #{cat.displayOrder ?? index + 1}
                    {isMoving && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-secondary text-foreground">
                    {itemCount} {itemCount === 1 ? "Item" : "Items"}
                  </span>
                </div>
                <h4 className="text-base font-black text-foreground tracking-tight">
                  {cat.name}
                </h4>
                {cat.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {cat.description}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs text-muted-foreground">
                <span className="font-mono text-[11px] text-muted-foreground truncate max-w-[120px]">
                  {cat.slug}
                </span>

                <div className="flex items-center gap-1">
                  {/* Reorder Buttons */}
                  <div className="flex items-center mr-1 bg-muted/60 rounded-lg p-0.5">
                    <button
                      type="button"
                      disabled={index === 0 || isMoving}
                      onClick={() => handleMoveOrder(cat.id, "up")}
                      className="p-1 rounded text-muted-foreground hover:bg-background hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move Up"
                    >
                      <ArrowUp className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      disabled={index === sortedCategories.length - 1 || isMoving}
                      onClick={() => handleMoveOrder(cat.id, "down")}
                      className="p-1 rounded text-muted-foreground hover:bg-background hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move Down"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </button>
                  </div>

                  <button
                    onClick={() => handleOpenEdit(cat)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    title="Edit Category"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => confirmDelete(cat)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    title="Delete Category"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Category Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md p-5">
          <DialogHeader>
            <DialogTitle className="text-lg font-black tracking-tight text-foreground">
              {editingCategory ? `Edit Category` : "Create New Category"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Categories appear as horizontal quick filters on the customer ordering screen.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-3.5 pt-2 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-foreground uppercase tracking-wider block">
                Category Name *
              </label>
              <input
                type="text"
                required
                disabled={isSaving}
                placeholder="e.g. Sourdough Sandwiches"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-foreground uppercase tracking-wider block">
                  Slug (URL Safe)
                </label>
                <input
                  type="text"
                  disabled={isSaving}
                  placeholder="sourdough-sandwiches"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground uppercase tracking-wider block">
                  Display Order
                </label>
                <input
                  type="number"
                  min={1}
                  disabled={isSaving}
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:ring-2 focus:ring-primary font-bold"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-foreground uppercase tracking-wider block">
                Short Description
              </label>
              <textarea
                rows={2}
                disabled={isSaving}
                placeholder="Brief summary of dishes in this section..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:ring-2 focus:ring-primary resize-none"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isSaving}
                onClick={() => setModalOpen(false)}
                className="h-10 rounded-xl text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="h-10 rounded-xl text-xs font-bold shadow-xs gap-1.5"
              >
                {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>{editingCategory ? "Save Changes" : "Create Category"}</span>
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-sm p-5">
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <DialogTitle className="text-base font-black tracking-tight">
                Delete Category
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs pt-1">
              Are you sure you want to delete category{" "}
              <strong className="text-foreground font-bold">&quot;{categoryToDelete?.name}&quot;</strong>?
              {categoryToDelete &&
                menuItems.filter((i) => i.categoryId === categoryToDelete.id).length > 0 && (
                  <span className="block mt-2 p-2 rounded-lg bg-destructive/10 text-destructive text-[11px] font-semibold">
                    Warning: {menuItems.filter((i) => i.categoryId === categoryToDelete.id).length}{" "}
                    item(s) belong to this category and will become uncategorized.
                  </span>
                )}
            </DialogDescription>
          </DialogHeader>

          <div className="pt-3 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isDeleting}
              onClick={() => {
                setDeleteConfirmOpen(false);
                setCategoryToDelete(null);
              }}
              className="h-9 rounded-xl text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={handleExecuteDelete}
              className="h-9 rounded-xl text-xs font-bold gap-1.5"
            >
              {isDeleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>Delete Category</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
