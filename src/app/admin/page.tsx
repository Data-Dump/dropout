"use client";

import React, { useState } from "react";
import { AdminAuthGate } from "@/components/admin/admin-auth-gate";
import { AdminLayout } from "@/components/admin/admin-layout";
import { OverviewView } from "@/components/admin/views/overview-view";
import { LiveOrdersView } from "@/components/admin/views/live-orders-view";
import { MenuManagementView } from "@/components/admin/views/menu-management-view";
import { CategoriesView } from "@/components/admin/views/categories-view";
import { TableManagementView } from "@/components/admin/views/table-management-view";
import { QRCodesView } from "@/components/admin/views/qr-codes-view";
import { PaymentsView } from "@/components/admin/views/payments-view";
import { SalesReportsView } from "@/components/admin/views/sales-reports-view";
import { StaffManagementView } from "@/components/admin/views/staff-management-view";
import { SettingsView } from "@/components/admin/views/settings-view";
import { QRGeneratorDialog } from "@/components/admin/qr-generator-dialog";
import { TableState } from "@/types";

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [selectedTableForQR, setSelectedTableForQR] = useState<TableState | null>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);

  const handleOpenQR = (table: TableState) => {
    setSelectedTableForQR(table);
    setQrModalOpen(true);
  };

  return (
    <AdminAuthGate>
      <AdminLayout activeTab={activeTab} onTabChange={setActiveTab}>
        {activeTab === "overview" && <OverviewView onNavigateTab={setActiveTab} />}
        {activeTab === "orders" && <LiveOrdersView />}
        {activeTab === "menu" && <MenuManagementView />}
        {activeTab === "categories" && <CategoriesView />}
        {activeTab === "tables" && <TableManagementView onOpenQR={handleOpenQR} />}
        {activeTab === "qr_codes" && <QRCodesView />}
        {activeTab === "payments" && <PaymentsView />}
        {activeTab === "reports" && <SalesReportsView />}
        {activeTab === "staff" && <StaffManagementView />}
        {activeTab === "settings" && <SettingsView />}

        <QRGeneratorDialog
          table={selectedTableForQR}
          open={qrModalOpen}
          onOpenChange={setQrModalOpen}
        />
      </AdminLayout>
    </AdminAuthGate>
  );
}
