import { Card, CardContent, CardTitle } from "@/components/ui/card";
import type { DashboardSystemCardProps } from "@/types/super-admin/dashboard";
import { useDashboardSystem } from "@/hooks/super-admin/dashboard/useDashboardSystem";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardSystem({
  title,
  value,
  icon,
}: DashboardSystemCardProps) {
  const { data, isPending } = useDashboardSystem();

  const totalOrgs = data?.data?.organization_statistics.total ?? 0;
  const corporate = data?.data?.business_statistics.by_type.corporate ?? 0;
  const education = data?.data?.business_statistics.by_type.education ?? 0;

  let displayValue: string | number = value ?? 0;
  if (title === "Total Organisations") displayValue = totalOrgs;
  if (title === "Businesses Orgs") displayValue = corporate;
  if (title === "Educational Orgs") displayValue = education;

  return (
    <Card className="bg-white shadow-none border-none">
      <CardContent>
        <div className="flex items-center justify-between pb-2">
          <CardTitle className="text-lg font-normal text-gray-700">
            {title}
          </CardTitle>
          {icon}
        </div>
        <div className="text-2xl font-semibold text-gray-900 text-left">
          {isPending ? <Skeleton className="h-7 w-20" /> : displayValue}
        </div>
      </CardContent>
    </Card>
  );
}