import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LockKeyhole, Edit, LogOut } from "lucide-react";
import ChangePassword from "./ChangePassword";
import EditProfile from "./EditProfile";
import { Label } from "../ui/label";
import type { ProfileData, AccountSettingsProps } from "@/types/settings-types";

export default function AccountSettings({
  profileData,
  onProfileUpdate,
  onLogout,
}: AccountSettingsProps) {
  return (
    <Card className="shadow-none sm:shadow-sm">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <CardTitle className="text-lg font-semibold">
          Account Settings
        </CardTitle>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <ChangePassword
            trigger={
              <Button
                variant="outline"
                size="sm"
                className="flex items-center justify-center gap-2 w-full sm:w-auto bg-gray-20 hover:bg-gray-30"
              >
                <LockKeyhole className="h-4 w-4" />
                Change Password?
              </Button>
            }
          />

          <EditProfile
            trigger={
              <Button
                size="sm"
                className="flex items-center justify-center gap-2 w-full sm:w-auto bg-blue-10 text-primary hover:bg-blue-20"
              >
                <Edit className="h-4 w-4" />
                Edit
              </Button>
            }
            profileData={profileData}
            onProfileUpdate={onProfileUpdate}
          />

          <Button
            variant="destructive"
            size="sm"
            onClick={onLogout}
            className="flex items-center justify-center gap-2 w-full sm:w-auto bg-[#FFEBEC] text-[#DE3B40] hover:bg-[#FFEBEC]"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
          {/* Form Fields */}
          <div className="flex-1 w-full grid grid-cols-1 lg:grid-cols-2 gap-4 text-left">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                First name
              </Label>
              <Input value={profileData.firstName} readOnly />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Last name
              </Label>
              <Input value={profileData.lastName} readOnly />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Email
              </Label>
              <Input value={profileData.email} readOnly />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Date of birth
              </Label>
              <Input value={profileData.dateOfBirth} readOnly />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Category
              </Label>
              <Input value={profileData.category} readOnly />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Role
              </Label>
              <Input value={profileData.role} readOnly />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

