"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, type TooltipProps } from "recharts";

import { CardContent, CardHeader } from "@/components/ui/card";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import DatePickerButton from "@/components/shared/DatePickerButton";
import type { ChartDatum } from "@/types/super-admin/dashboard";

const CustomTooltip: React.FC<TooltipProps<number, string>> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = (payload[0]?.payload as ChartDatum) || undefined;
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-semibold text-gray-900 mb-2">{data?.orgName}</p>
        <div className="space-y-1">
          <p className="text-sm text-gray-600">
            Hours: <span className="font-medium text-gray-900">{data?.hours} hrs</span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

// Chart data for Average Time Spent
const chartData = [
  { orgName: "Org name", hours: 4 },
  { orgName: "Org name", hours: 8 },
  { orgName: "Org name", hours: 15.7 },
  { orgName: "Org name", hours: 6 },
  { orgName: "Org name", hours: 12 },
  { orgName: "Org name", hours: 9 },
];

const chartConfig = {
  hours: { label: "Hours", color: "#9CA3AF" },
};

export default function AvgTimeSpentChart() {
  // Date logic for from and to date pickers
  const today = useMemo(() => new Date(), []);
  const thirtyDaysAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d;
  }, []);

  const [fromDate, setFromDate] = useState<Date>(thirtyDaysAgo);
  const [toDate, setToDate] = useState<Date>(today);

  return (
    <div className="w-full flex flex-col justify-between h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Average Time Spent</h3>
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">In Hours</span>
        </div>

        {/* Date Range Pickers */}
        <div className="invisible flex items-center gap-4">
          {/* From Date Picker */}
          <DatePickerButton
            date={fromDate}
            onSelect={(d) => {
              if (!d) return;
              setFromDate(d);
              if (toDate && d > toDate) setToDate(d);
            }}
            disabled={(date: Date) => (toDate ? date > toDate : false)}
          />

          {/* To Date Picker */}
          <DatePickerButton
            date={toDate}
            onSelect={(d) => d && setToDate(d)}
            disabled={(date: Date) => (fromDate ? date < fromDate : false)}
          />
        </div>
      </CardHeader>

      <CardContent className="h-72 mb-2">
        <ChartContainer config={chartConfig}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="orgName"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                tick={{ fontSize: 12, fill: "#6B7280" }}
              />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#6B7280" }} domain={[0, 16]} />
              <ChartTooltip content={<CustomTooltip />} cursor={false} />
              <Bar dataKey="hours" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </div>
  );
}