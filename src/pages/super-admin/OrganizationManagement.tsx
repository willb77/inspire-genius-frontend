import {
  DataTable,
  type Column,
} from "@/components/super-admin/organization/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
// import AddOrganization from "@/components/super-admin/organization/AddOrganizations";
import SuperAdminLayout from "@/layouts/SuperAdminLayout";
import { useMemo, useState } from "react";
import ActionMenu from "@/components/shared/ActionMenu";
import Pagination from "@/components/shared/Pagination";

type OrganizationRow = {
  id: string;
  name: string;
  type: string;
  admin_name: string;
  email: string;
  status: "Active" | "Deactivated";
};

export default function SuperAdminOrganizations() {
  const [rows] = useState<OrganizationRow[]>([
    {
      id: "1",
      name: "EezieShift",
      type: "Education",
      admin_name: "David Smith",
      email: "david.smith@gmail.com",
      status: "Active",
    },
    {
      id: "2",
      name: "Innovasys",
      type: "Both",
      admin_name: "Sofia Perez",
      email: "sofia.perez@gmail.com",
      status: "Deactivated",
    },
    {
      id: "3",
      name: "WizeVive",
      type: "Business",
      admin_name: "Abhi Kurne",
      email: "abhi@gmail.com",
      status: "Active",
    },
  ]);

  const [sortKey, setSortKey] = useState<keyof OrganizationRow | undefined>();
  const [sortDirection, setSortDirection] = useState<
    "asc" | "desc" | undefined
  >();
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const onSortChange = (key: string) => {
    if (!key) return;
    if (sortKey === key) {
      setSortDirection((prev) =>
        prev === "asc" ? "desc" : prev === "desc" ? undefined : "asc"
      );
    } else {
      setSortKey(key as keyof OrganizationRow);
      setSortDirection("asc");
    }
    setPage(1);
  };

  const sortedRows = useMemo(() => {
    if (!sortKey || !sortDirection) return rows;
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp = String(av).localeCompare(String(bv));
      return sortDirection === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [rows, sortKey, sortDirection]);

  const total = sortedRows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const paginated = sortedRows.slice(start, start + pageSize);

  // Action config controlled by parent
  const actionConfig = {
    showView: true,
    showEdit: true,
    showDeactivate: true,
    viewOptions: [
      { label: "Business", value: "business" },
      { label: "Education", value: "education" },
    ],
    editOptions: [
      { label: "Business", value: "business" },
      { label: "Education", value: "education" },
    ],
  } as const;

  const columns: Column<OrganizationRow>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      // No extra wrappers; just value by default
    },
    { key: "type", header: "Type", sortable: true },
    { key: "admin_name", header: "Admin Name", sortable: true },
    { key: "email", header: "Email", sortable: true },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (row) => (
        <Badge
          variant="secondary"
          className={
            row.status === "Active"
              ? "bg-green-100 text-green-700 border-transparent"
              : "bg-gray-200 text-gray-700 border-transparent"
          }
        >
          {row.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Action",
      render: (row) => (
        <ActionMenu
          row={row}
          align="end"
          showView={actionConfig.showView}
          showEdit={actionConfig.showEdit}
          showDeactivate={actionConfig.showDeactivate}
          viewOptions={actionConfig.viewOptions}
          editOptions={actionConfig.editOptions}
          onView={(_, opt) => console.log("View", row.id, opt)}
          onEdit={(_, opt) => console.log("Edit", row.id, opt)}
          onDeactivate={() => console.log("Deactivate", row.id)}
        />
      ),
    },
  ];

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-left">
            Organization Management
          </h1>
          <div className="flex flex-wrap gap-6">
         
            <Button>
              <Plus className="size-4" />
              Add Organization
            </Button>
            {/* <AddOrganization
              trigger={
                <Button>
                  <Plus className="size-4" />
                  Add Organization
                </Button>
              }
            /> */}
          </div>
        </div>
        <div className="h-[calc(100vh-15rem)]">
          <DataTable
            columns={columns}
            data={paginated}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSortChange={onSortChange}
          />
        </div>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div>
            Show {Math.min(pageSize, total - start)} of {total} results
          </div>
          <Pagination
            pageCount={totalPages}
            page={page}
            onPageChange={setPage}
          />
        </div>
      </div>
    </SuperAdminLayout>
  );
}
