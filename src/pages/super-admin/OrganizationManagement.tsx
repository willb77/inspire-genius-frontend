"use client";

import SuperAdminLayout from "@/layouts/SuperAdminLayout";

export default function OrganizationManagement() {
  return (
    <SuperAdminLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Organizational Management</h1>
        <p className="text-muted-foreground">Manage organizations, licenses, and settings.</p>
      </div>
    </SuperAdminLayout>
  );
}
