"use client";

import SuperAdminLayout from "@/layouts/SuperAdminLayout";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, Calendar as CalendarIcon, Building2, Handshake, BookOpen } from "lucide-react";
import { Card } from "@/components/ui/card";
import LicenseExpiring from "@/components/super-admin/dashboard/LicenseExpiring";
import AvgTimeSpentChart from "@/components/super-admin/dashboard/AvgTimeSpentChart";
import HelpAndSupport from "@/components/super-admin/dashboard/HelpAndSupport";
import { DocumentUploadTrend } from "@/components/super-admin/dashboard/DocumentUploadTrend";
import OrganizationStatCard from "@/components/super-admin/dashboard/OrganizationCards";
import { UsedCoachesChartNew } from "@/components/super-admin/dashboard/UsedCoachesChartNew";
import { useMemo, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { format as formatDate } from "date-fns";

export default function SuperAdminDashboard() {
  // Date logic (same as ExportChatModal)
  const today = useMemo(() => new Date(), []);
  const thirtyDaysAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d;
  }, []);
  const [fromDate, setFromDate] = useState<Date>(thirtyDaysAgo);
  const [toDate, setToDate] = useState<Date>(today);

  const orgStats = [
    { title: "Total Organisations", value: "150,000", icon: <Building2 className="h-6 w-6 text-gray-600" /> },
    { title: "Businesses Orgs", value: "56,000", icon: <Handshake className="h-6 w-6 text-gray-600" /> },
    { title: "Educational Orgs", value: "24,012", icon: <BookOpen className="h-6 w-6 text-gray-600" /> },
  ];

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        {/* Header with Dashboard title and avatars */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center -space-x-2">
              <Avatar className="h-9 w-9 border-2 border-white">
                <AvatarFallback className="bg-gray-200">
                  <User className="h-5 w-5 text-gray-600" />
                </AvatarFallback>
              </Avatar>
              <Avatar className="h-9 w-9 border-2 border-white">
                <AvatarFallback className="bg-gray-200">
                  <User className="h-5 w-5 text-gray-600" />
                </AvatarFallback>
              </Avatar>
              <Avatar className="h-9 w-9 border-2 border-white">
                <AvatarFallback className="bg-gray-100 text-sm font-medium text-gray-700">
                  +2
                </AvatarFallback>
              </Avatar>
            </div>

            {/* From Date Picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="justify-start text-left font-normal h-9"
                >
                  <CalendarIcon className="mr-2 size-4 text-muted-foreground" />
                  {fromDate ? (
                    formatDate(fromDate, "dd-MM-yyyy")
                  ) : (
                    <span className="text-muted-foreground">Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="p-0">
                <Calendar
                  mode="single"
                  selected={fromDate}
                  onSelect={(d) => d && setFromDate(d)}
                  disabled={(date) => (toDate ? date > toDate : false)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            {/* To Date Picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="justify-start text-left font-normal h-9"
                >
                  <CalendarIcon className="mr-2 size-4 text-muted-foreground" />
                  {toDate ? (
                    formatDate(toDate, "dd-MM-yyyy")
                  ) : (
                    <span className="text-muted-foreground">Pick a date</span>
                  )}
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
        </div>

        {/* Top Row: Organization Cards and Average Time Spent Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Organization Overview Cards */}
          <div className="space-y-4 bg-gray-20 p-2">
            {orgStats.map((item) => (
              <OrganizationStatCard key={item.title} title={item.title} value={item.value} icon={item.icon} />
            ))}
          </div>

          {/* Average Time Spent Chart */}
          <div className="lg:col-span-2">
            <Card className="bg-gray-20 shadow-sm h-full border-none pt-2">
              <AvgTimeSpentChart />
            </Card>
          </div>
        </div>

        {/* Middle Row: Most Used Coaches and License Expiring */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Most Used Coaches */}
          <Card className="lg:col-span-2 bg-gray-20 border-none">
            <UsedCoachesChartNew />
          </Card>

          {/* License Expiring */}
          <Card className="bg-gray-20 shadow-sm border-none">
            <LicenseExpiring />
          </Card>
        </div>

        {/* Bottom Row: Help & Support and Document Upload Trend */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Help & Support */}
          <Card className="bg-gray-20 shadow-sm border-none">
            <HelpAndSupport />
          </Card>
          {/* Document Upload Trend */}
          <Card className="bg-gray-20 shadow-sm border-none">
            <DocumentUploadTrend />
          </Card>
        </div>
      </div>
    </SuperAdminLayout>
  );
}
 