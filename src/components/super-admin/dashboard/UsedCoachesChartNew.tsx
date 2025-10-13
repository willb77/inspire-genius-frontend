"use client"

import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts"

import {
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
    type
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

const chartData = [
  { month: "Job Search", desktop: 186, mobile: 80 },
  { month: "Personal", desktop: 305, mobile: 200 },
  { month: "Human Resources", desktop: 237, mobile: 120 },
  { month: "Education", desktop: 73, mobile: 190 },
  { month: "Wellness", desktop: 209, mobile: 130 },
  { month: "Others", desktop: 214, mobile: 140 },
]

const chartConfig = {
  desktop: {
    label: "Desktop",
    color: "var(--chart-2)",
  },
  mobile: {
    label: "Mobile",
    color: "var(--chart-2)",
  },
  label: {
    color: "var(--background)",
  },
} satisfies ChartConfig

export function UsedCoachesChartNew() {
  return (
    <div>
      <CardHeader className="text-left pb-2">
        <CardTitle>Most Used Coaches</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart
            accessibilityLayer
            data={chartData}
            layout="vertical"
            margin={{
              right: 16,
            }}
          >
            <CartesianGrid horizontal={false} />
            <YAxis
              dataKey="month"
              type="category"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <XAxis dataKey="desktop" type="number"axisLine={false} tickLine={false}/>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="line" />}
            />
            <Bar
              dataKey="desktop"
              layout="vertical"
              fill="#3b82f6"
              radius={4}
            >
              <LabelList
                dataKey="desktop"
                position="right"
                offset={8}
                className="fill-foreground"
                fontSize={12}
                
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </div>
  )
}
