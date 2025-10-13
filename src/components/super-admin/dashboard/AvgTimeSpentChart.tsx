"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, type TooltipProps } from "recharts";
import { Calendar as CalendarIcon } from "lucide-react";
import { format as formatDate } from "date-fns";

import { CardContent, CardHeader } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { Calendar } from "@/components/ui/calendar";

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

  // Custom Tooltip component
  type ChartDatum = { orgName: string; hours: number };
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

  return (
    <div className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-10">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Average Time Spent</h3>
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">In Hours</span>
        </div>

        {/* Date Range Pickers */}
        <div className="flex items-center gap-4">
          {/* From Date Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start text-left font-normal h-9 flex items-center">
                <CalendarIcon className="mr-2 size-4 text-muted-foreground" />
                {fromDate ? formatDate(fromDate, "dd-MM-yyyy") : <span className="text-muted-foreground">Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="p-0">
              <Calendar
                mode="single"
                selected={fromDate}
                onSelect={(d) => {
                  if (!d) return;
                  setFromDate(d);
                  if (toDate && d > toDate) {
                    setToDate(d);
                  }
                }}
                disabled={(date) => (toDate ? date > toDate : false)}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {/* To Date Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start text-left font-normal h-9 flex items-center">
                <CalendarIcon className="mr-2 size-4 text-muted-foreground" />
                {toDate ? formatDate(toDate, "dd-MM-yyyy") : <span className="text-muted-foreground">Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="p-0">
              <Calendar
                mode="single"
                selected={toDate}
                onSelect={(d) => d && setToDate(d)}
                disabled={(date) => (fromDate ? date < fromDate : false)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>

      <CardContent className="h-72">
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