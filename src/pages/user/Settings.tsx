import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import UserLayout from "@/layouts/UserLayout";
import { Search } from "lucide-react";
import AccountSettings from "@/components/settings/AccountSettings";
import NotificationSettings from "@/components/settings/NotificationSettings";

export default function Settings() {
  const [searchQuery, setSearchQuery] = useState("");
  const [pushNotifications, setPushNotifications] = useState(true);
  const [updateNotifications, setUpdateNotifications] = useState(true);
  const [marketingNotifications, setMarketingNotifications] = useState(false);

  // Profile data
  const [profileData, setProfileData] = useState({
    firstName: "Jhon",
    lastName: "Doe",
    email: "john@example.com",
    dateOfBirth: "22-09-1998",
    category: "Business",
    role: "Human Resource Manager",
  });

  const handleProfileUpdate = (updatedData: typeof profileData) => {
    setProfileData(updatedData);
  };

  const handleLogout = () => {
    if (confirm("Are you sure you want to logout?")) {
      alert("Logged out successfully!");
    }
  };

  return (
    <UserLayout>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
            Settings
          </h1>

          {/* Search Bar */}
          <div className="relative w-full sm:w-80">
            <Input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={20}
              strokeWidth={2}
            />
          </div>
        </div>

        {/* Account Settings Card */}
        <AccountSettings
          profileData={profileData}
          onProfileUpdate={handleProfileUpdate}
          onLogout={handleLogout}
        />

        {/* Notifications Settings Card */}
        <NotificationSettings
          pushNotifications={pushNotifications}
          updateNotifications={updateNotifications}
          marketingNotifications={marketingNotifications}
          onPushNotificationsChange={setPushNotifications}
          onUpdateNotificationsChange={setUpdateNotifications}
          onMarketingNotificationsChange={setMarketingNotifications}
        />

        {/* Legal Card */}
        <Card className="shadow-sm">
          <CardHeader className="text-left">
            <CardTitle className="text-lg font-semibold">Legal</CardTitle>
          </CardHeader>
          <CardContent className="text-left">
            <div>
              <a
                href="#"
                className="text-blue-600 hover:text-blue-800 text-sm underline"
              >
                Terms of service
              </a>
              <br />
              <a
                href="#"
                className="text-blue-600 hover:text-blue-800 text-sm underline"
              >
                Privacy policy
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </UserLayout>
  );
}
