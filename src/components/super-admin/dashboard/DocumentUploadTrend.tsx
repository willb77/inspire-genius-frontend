"use client";

import { Pie, PieChart, Cell, type TooltipProps } from "recharts";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart";

export const description = "A donut chart";

const chartData = [
  { browser: "Resume", Uploads: 275, color: "var(--chart-1)" },
  { browser: "Health Data", Uploads: 200, color: "var(--chart-2)" },
  { browser: "Job Description", Uploads: 187, color: "var(--chart-3)" },
  { browser: "Notes", Uploads: 173, color: "var(--chart-4)" },
  { browser: "Others", Uploads: 90, color: "var(--chart-5)" },
];

const chartConfig = {
  Uploads: { label: "Uploads" },
} satisfies ChartConfig;

// ✅ Custom Tooltip component
const CustomTooltip = ({
  active,
  payload,
}: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="rounded-lg border bg-white px-3 py-2 shadow-sm">
        <p className="text-sm font-semibold text-gray-900">{data.name}</p>
        <p className="text-xs text-gray-600">
          Uploads:{" "}
          <span className="font-medium text-gray-800">{data.value}</span>
        </p>
      </div>
    );
  }
  return null;
};

export function DocumentUploadTrend() {
  return (
    <div className="w-full">
      <CardHeader className="pb-12">
        <CardTitle className="text-left text-lg font-semibold">
          Documents Uploads Trend
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col sm:flex-row items-center justify-between pb-4">
        {/* Left Side - Chart */}
        <div className="flex-1 flex justify-center">
          <ChartContainer
            config={chartConfig}
            className="aspect-square w-[250px] h-[250px]"
          >
            <PieChart width={250} height={250}>
              <ChartTooltip cursor={false} content={<CustomTooltip />} />

              <Pie
                data={chartData}
                dataKey="Uploads"
                nameKey="browser"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
        </div>

        {/* Right Side - Labels */}
        <div className="flex flex-col justify-center gap-3 sm:ml-8 mt-4 sm:mt-0">
          {chartData.map((item, index) => (
            <div key={index} className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color }}
              ></div>
              <span className="text-sm text-gray-700">{item.browser}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </div>
  );
}
