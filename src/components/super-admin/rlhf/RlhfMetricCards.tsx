import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Star, MessageSquare, TrendingUp } from "lucide-react"
import type { FeedbackStatsData } from "@/types/feedback"

type RlhfMetricCardsProps = {
  stats?: FeedbackStatsData | null
  isLoading?: boolean
}

export default function RlhfMetricCards({ stats, isLoading }: RlhfMetricCardsProps) {
  const cards = [
    {
      title: "Total Feedback",
      value: stats?.total_count ?? 0,
      icon: MessageSquare,
      color: "text-teal-600",
      bg: "bg-teal-50",
    },
    {
      title: "Average Rating",
      value: stats?.avg_rating ? stats.avg_rating.toFixed(1) : "—",
      icon: Star,
      color: "text-yellow-600",
      bg: "bg-yellow-50",
    },
    {
      title: "5-Star Ratings",
      value: stats?.rating_distribution?.["5"] ?? 0,
      icon: TrendingUp,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      title: "1-Star Ratings",
      value: stats?.rating_distribution?.["1"] ?? 0,
      icon: TrendingUp,
      color: "text-red-600",
      bg: "bg-red-50",
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => (
        <Card key={c.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {c.title}
            </CardTitle>
            <div className={`${c.bg} p-2 rounded-lg`}>
              <c.icon className={`size-4 ${c.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : c.value}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
