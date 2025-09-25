import UserLayout from "@/layouts/UserLayout";

export default function Help() {
  return (
    <UserLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Help & Support</h1>
        <p className="text-muted-foreground">Find FAQs, guides, and contact options.</p>
      </div>
    </UserLayout>
  );
}
