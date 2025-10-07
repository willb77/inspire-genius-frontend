import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import UserLayout from "@/layouts/UserLayout";
import SearchBar from "@/components/shared/SearchBar";
import AccountSettings from "@/components/settings/AccountSettings";
import NotificationSettings from "@/components/settings/NotificationSettings";

export default function Settings() {
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
      <div className="space-y-4">
        <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <SearchBar />
        </div>

        {/* Account Settings Card */}
        <div data-tour="settings-account">
          <AccountSettings
            profileData={profileData}
            onProfileUpdate={handleProfileUpdate}
            onLogout={handleLogout}
          />
        </div>

        {/* Notifications Settings Card */}
        <div data-tour="settings-notifications">
          <NotificationSettings
            pushNotifications={pushNotifications}
            updateNotifications={updateNotifications}
            marketingNotifications={marketingNotifications}
            onPushNotificationsChange={setPushNotifications}
            onUpdateNotificationsChange={setUpdateNotifications}
            onMarketingNotificationsChange={setMarketingNotifications}
          />
        </div>

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
