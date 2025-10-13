import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const licenseData = [
  { orgName: "Organization Name", daysRemaining: 2, count: 47 },
  { orgName: "Organization Name", daysRemaining: 5, count: 19 },
  { orgName: "Organization Name", daysRemaining: 7, count: 102 },
];

export default function LicenseExpiring() {
  return (
    <div className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold">
          License Expiring
        </CardTitle>
        <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
          View all
        </button>
      </CardHeader>
      <CardContent className="space-y-4">
        {licenseData.map((license, index) => (
          <div
            key={index}
            className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0"
          >
            <Card className="lg:col-span-1 w-full p-4 shadow-none border-none">
              <div className="flex items-center justify-between">
                {/* Left side */}
                <div className="flex flex-col text-left">
                  <p className="text-sm text-gray-600">{license.orgName}</p>
                  <p className="text-lg font-medium">
                    {license.daysRemaining} days remaining
                  </p>
                </div>

                {/* Right side */}
                <div className="text-2xl font-bold text-gray-900">
                  {license.count}
                </div>
              </div>
            </Card>
          </div>
        ))}
      </CardContent>
    </div>
  );
}
