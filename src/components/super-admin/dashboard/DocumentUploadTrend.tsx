"use client";

import { Pie, PieChart } from "recharts";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo } from "react";
import { useDocumentTrend } from "@/hooks/super-admin/dashboard/useDocumentTrend";

export const description = "A donut chart";

const chartConfig = {
  Count: {
    label: "Count",
  },
} satisfies ChartConfig;

export function DocumentUploadTrend() {
  const { data, isPending } = useDocumentTrend();

  const chartData = useMemo(() => {
    const colors = [
      "var(--chart-1)",
      "var(--chart-2)",
      "var(--chart-3)",
      "var(--chart-4)",
      "var(--chart-5)",
    ];
    const items = Array.isArray(data?.data) ? data!.data! : [];
    return items.map((item, index) => ({
      category: item.category_name,
      // Count: item.file_count ?? 0,
      Count: 10,
      fill: colors[index % colors.length],
    }));
  }, [data]);

  return (
    <div className="flex flex-col">
      <CardHeader className="pb-0 text-left">
        <CardTitle className="text-base font-semibold text-gray-800">
          Documents Uploads Trend
        </CardTitle>
      </CardHeader>

      <CardContent className="flex items-center justify-center p-6">
        {isPending ? (
          <Skeleton className="h-[250px] w-[250px] rounded-full" />
        ) : (
          <div className="flex flex-row items-center justify-center gap-8">
            {/* Chart Section */}
            <ChartContainer
              config={chartConfig}
              className="aspect-square w-[230px] h-[230px]"
            >
              <PieChart width={230} height={230}>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Pie
                  data={chartData}
                  dataKey="Count"
                  nameKey="category"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={3}
                />
              </PieChart>
            </ChartContainer>

            <div className="flex flex-col space-y-3">
              {chartData.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-2 text-sm text-gray-700"
                >
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: item.fill }}
                  ></span>
                  <span>{item.category}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </div>
  );
}