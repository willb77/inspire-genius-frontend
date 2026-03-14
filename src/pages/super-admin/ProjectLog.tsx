import SuperAdminLayout from "@/layouts/SuperAdminLayout";

export default function ProjectLog() {
  return (
    <SuperAdminLayout>
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <div className="mb-4">
          <h1 className="text-2xl font-bold tracking-tight">Project Log</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Documentation, change log, database schema, and development rules
          </p>
        </div>

        <iframe
          src="/IG_project_log.html"
          title="IG Project Log"
          className="w-full flex-1 border-0 rounded-lg"
        />
      </div>
    </SuperAdminLayout>
  );
}
