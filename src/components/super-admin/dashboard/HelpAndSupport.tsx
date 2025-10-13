import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const helpData = [
  {
    title: "Unable to access dashboard",
    status: "Pending",
    description:
      "User reported an issue with logging in to the main dashboard.",
  },
  {
    title: "Payment gateway issue",
    status: "In Progress",
    description: "Transactions are failing intermittently for certain users.",
  },
  {
    title: "Request for feature update",
    status: "Resolved",
    description: "Added new filters in the analytics page as requested.",
  },
];

export default function HelpAndSupport() {
  return (
    <div className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold">Help & Support</CardTitle>
        <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
          View all
        </button>
      </CardHeader>

      <CardContent className="space-y-4">
        {helpData.map((item, index) => (
          <Card key={index} className="p-4 shadow-none border-none">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900">
                {item.title}
              </p>

              <Badge
                variant="secondary"
                className={`capitalize ${
                  item.status === "Pending"
                    ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                    : item.status === "In Progress"
                    ? "bg-blue-100 text-blue-800 hover:bg-blue-100"
                    : "bg-green-100 text-green-800 hover:bg-green-100"
                }`}
              >
                {item.status}
              </Badge>
            </div>

            <p className="text-sm text-gray-600 mt-1 text-left">
              {item.description}
            </p>
          </Card>
        ))}
      </CardContent>
    </div>
  );
}
