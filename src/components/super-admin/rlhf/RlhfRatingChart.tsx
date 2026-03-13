import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import type { FeedbackStatsData } from "@/types/feedback"

type RlhfRatingChartProps = {
  stats?: FeedbackStatsData | null
}

export default function RlhfRatingChart({ stats }: RlhfRatingChartProps) {
  const distribution = stats?.rating_distribution ?? {}

  const chartData = [1, 2, 3, 4, 5].map((rating) => ({
    rating: `${rating} Star`,
    count: distribution[String(rating)] ?? 0,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Rating Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="rating" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#14b8a6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
