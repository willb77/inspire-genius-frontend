import CompanyAdminLayout from "@/layouts/CompanyAdminLayout"

export default function CompanyAdminUsers() {
  return (
    <CompanyAdminLayout>
      <h1 className="text-2xl font-bold">User Management</h1>
      <p className="text-muted-foreground mt-2">Provision and manage users within your organization.</p>
    </CompanyAdminLayout>
  )
}
