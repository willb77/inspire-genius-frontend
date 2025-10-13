"use client";

import SuperAdminLayout from "@/layouts/SuperAdminLayout";

export default function CoachManagement() {
  return (
    <SuperAdminLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Coach Management</h1>
        <p className="text-muted-foreground">Manage coaches, access control, and assignments.</p>
      </div>
    </SuperAdminLayout>
  );
}
