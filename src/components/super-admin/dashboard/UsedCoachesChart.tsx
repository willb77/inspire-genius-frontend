"use client";

import { MoreVertical, Star } from "lucide-react";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const chartData = [
  { coach: "Job Search", usage: 18000, rating: 4.4 },
  { coach: "Personal", usage: 15000, rating: 4.3 },
  { coach: "Human Resources", usage: 12000, rating: 4.6 },
  { coach: "Education", usage: 8000, rating: 3.8 },
  { coach: "Wellness", usage: 6000, rating: 4.1 },
  { coach: "Others", usage: 4000, rating: 3.9 },
];

export default function UsedCoachesChart() {
  const maxUsage = 20000; // for scaling bar width

  return (
    <div className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
        <CardTitle className="text-lg font-semibold">
          Most Used Coaches
        </CardTitle>
        <button className="p-1 hover:bg-gray-100 rounded">
          <MoreVertical className="h-4 w-4 text-gray-600" />
        </button>
      </CardHeader>

      <CardContent className="space-y-4">
        {chartData.map((item, index) => (
          <div key={index} className="flex items-center gap-4 pb-4">
            {/* Coach Name */}
            <div className="w-36 text-sm font-medium text-gray-700">
              {item.coach}
            </div>

            {/* Bar + Rating */}
            <div className="flex-1 relative h-5">
              <div
                className="h-5 bg-blue-700 rounded-sm"
                style={{ width: `${(item.usage / maxUsage) * 100}%` }}
              />

              <div
                className="absolute top-0 flex items-center gap-1 text-sm font-medium text-gray-900"
                style={{
                  left: `${(item.usage / maxUsage) * 100}%`,
                  transform: "translateX(4px)",
                }}
              >
                <span>{item.rating}</span>
                <Star className="h-3 w-3" />
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </div>
  );
}
