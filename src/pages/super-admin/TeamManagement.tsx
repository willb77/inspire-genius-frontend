"use client";

import SuperAdminLayout from "@/layouts/SuperAdminLayout";

export default function TeamManagement() {
  return (
    <SuperAdminLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Team Management</h1>
        <p className="text-muted-foreground">Manage super admin team members here.</p>
      </div>
    </SuperAdminLayout>
  );
}
