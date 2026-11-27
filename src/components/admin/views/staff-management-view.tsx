"use client";

import React, { useState } from "react";
import { useRestaurant } from "@/lib/store/restaurant-store";
import { StaffMember, StaffRole } from "@/types";
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
  Phone,
  KeyRound,
} from "lucide-react";
import { toast } from "sonner";

const STAFF_ROLES: StaffRole[] = ["Manager", "Head Chef", "Cashier", "Barista", "Server"];

export function StaffManagementView() {
  const { staff, addStaff, updateStaff, deleteStaff, toggleStaffDuty } = useRestaurant();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [role, setRole] = useState<StaffRole>("Server");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");

  const handleOpenAdd = () => {
    setEditingStaff(null);
    setName("");
    setRole("Server");
    setPhone("");
    setPin(String(Math.floor(1000 + Math.random() * 9000)));
    setModalOpen(true);
  };

  const handleOpenEdit = (member: StaffMember) => {
    setEditingStaff(member);
    setName(member.name);
    setRole(member.role);
    setPhone(member.phone);
    setPin(member.pin);
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !pin.trim()) {
      toast.error("Please enter staff name and 4-digit PIN.");
      return;
    }

    if (editingStaff) {
      updateStaff(editingStaff.id, {
        name: name.trim(),
        role,
        phone: phone.trim() || undefined,
        pin: pin.trim(),
      });
      toast.success(`Updated staff details for "${name}"`);
    } else {
      addStaff({
        name: name.trim(),
        role,
        phone: phone.trim() || "+91 90000 00000",
        pin: pin.trim(),
        status: "on_duty",
        joinedDate: new Date().toISOString().split("T")[0],
      });
      toast.success(`Staff member "${name}" registered`);
    }
    setModalOpen(false);
  };

  const handleDelete = (member: StaffMember) => {
    if (confirm(`Remove "${member.name}" from staff roster?`)) {
      deleteStaff(member.id);
      toast.success(`Staff member "${member.name}" removed`);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-black text-foreground tracking-tight">
            Staff & Shift Management
          </h3>
          <p className="text-xs text-muted-foreground">
            Manage crew members, roles, shift duty status and 4-digit POS PINs.
          </p>
        </div>

        <Button onClick={handleOpenAdd} className="h-10 rounded-xl text-xs font-bold gap-2 shadow-xs">
          <Plus className="h-4 w-4" />
          <span>Add Staff Member</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {staff.map((member) => (
          <div
            key={member.id}
            className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs space-y-3.5 hover:border-primary/40 transition-all"
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-base font-black text-foreground tracking-tight">
                    {member.name}
                  </h4>
                  <span className="text-xs text-primary font-bold block">
                    {member.role}
                  </span>
                </div>

                <button
                  onClick={() => {
                    toggleStaffDuty(member.id);
                    toast.info(
                      `${member.name} is now ${member.status === "on_duty" ? "Off Duty" : "On Duty"}`
                    );
                  }}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${
                    member.status === "on_duty"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100"
                      : "bg-stone-100 text-stone-600 border border-stone-300 hover:bg-stone-200"
                  }`}
                >
                  {member.status === "on_duty" ? "● On Duty" : "○ Off Duty"}
                </button>
              </div>

              <div className="my-3 space-y-1.5 text-xs text-muted-foreground pt-1 border-t border-border/50">
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5" />
                  <span>{member.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <KeyRound className="h-3.5 w-3.5" />
                  <span>POS Access PIN: <strong className="font-mono text-foreground font-black">{member.pin}</strong></span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
              <span className="text-[10px] text-muted-foreground font-medium">
                Joined: {member.joinedDate}
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleOpenEdit(member)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  title="Edit Staff Member"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(member)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  title="Delete Staff Member"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md p-5">
          <DialogHeader>
            <DialogTitle className="text-lg font-black tracking-tight text-foreground">
              {editingStaff ? `Edit Staff Member` : "Register Staff Member"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Assign kitchen or counter roles with individual 4-digit unlock PINs.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-3.5 pt-2 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-foreground uppercase tracking-wider block">
                Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Kaushal Malvi"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-foreground uppercase tracking-wider block">
                  Staff Role *
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as StaffRole)}
                  className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:ring-2 focus:ring-primary font-bold"
                >
                  {STAFF_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground uppercase tracking-wider block">
                  POS PIN (4-Digits) *
                </label>
                <input
                  type="text"
                  maxLength={4}
                  required
                  placeholder="e.g. 5678"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background p-2.5 text-xs font-mono font-black text-center focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-foreground uppercase tracking-wider block">
                Contact Phone
              </label>
              <input
                type="tel"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                className="h-10 rounded-xl text-xs font-bold"
              >
                Cancel
              </Button>
              <Button type="submit" className="h-10 rounded-xl text-xs font-bold shadow-xs">
                {editingStaff ? "Update Staff" : "Add Staff"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
