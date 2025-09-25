import UserLayout from "@/layouts/UserLayout";

export default function Settings() {
  return (
    <UserLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your preferences and account settings.</p>
      </div>
    </UserLayout>
  );
}
