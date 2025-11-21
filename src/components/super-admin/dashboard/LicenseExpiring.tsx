import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMemo } from "react";
import { useLicence } from "@/hooks/super-admin/dashboard/useLicence";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function LicenseExpiring() {
  const navigate = useNavigate();
  const { data, isPending } = useLicence({ page: 1, limit: 10 });

  const items = useMemo(() => {
    const list = data?.data?.licenses ?? [];
    return [...list]
      .sort((a, b) => (a.days_until_expiry ?? 0) - (b.days_until_expiry ?? 0))
      .slice(0, 4);
  }, [data]);

  return (
    <div className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold">
          License Expiring
        </CardTitle>
        <Button
          variant={"link"}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
          onClick={() => navigate("/super-admin/dashboard/licences")}
        >
          View all
        </Button>
      </CardHeader>
      <CardContent>
        {isPending && (
          <>
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-1 border-b border-gray-100 last:border-b-0"
              >
                <Card className="lg:col-span-1 w-full p-4 shadow-none border-none">
                  <div className="flex items-center justify-between">
                    {/* Left side */}
                    <div className="flex flex-col text-left gap-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-5 w-48" />
                    </div>

                    {/* Right side */}
                    <div className="flex flex-col items-end gap-2">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </div>
                </Card>
              </div>
            ))}
          </>
        )}

        {!isPending &&
          items.map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-1 border-b border-gray-100 last:border-b-0"
            >
              <Card className="lg:col-span-1 w-full p-4 shadow-none border-none">
                <div className="flex items-center justify-between">
                  {/* Left side */}
                  <div className="flex flex-col text-left">
                    <p className="text-sm text-gray-600">
                      {item.organization_name}
                    </p>
                    <p className="text-lg font-medium">
                      {item.days_until_expiry} days remaining
                    </p>
                  </div>

                  {/* Right side */}
                  <div className="text-right">
                    <div className="text-xs text-gray-500">
                      {item.subscription_tier}
                    </div>
                    <div className="text-sm font-semibold text-gray-900">
                      {item.status}
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          ))}
      </CardContent>
    </div>
  );
}
