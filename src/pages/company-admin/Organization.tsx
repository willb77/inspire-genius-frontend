import CompanyAdminLayout from "@/layouts/CompanyAdminLayout"

export default function CompanyAdminOrganization() {
  return (
    <CompanyAdminLayout>
      <h1 className="text-2xl font-bold">Organization</h1>
      <p className="text-muted-foreground mt-2">Organization-wide configuration and settings.</p>
    </CompanyAdminLayout>
  )
}
