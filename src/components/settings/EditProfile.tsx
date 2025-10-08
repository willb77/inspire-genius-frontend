import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Upload, Calendar } from "lucide-react";
import { Label } from "../ui/label";
import type { ProfileData, EditProfileProps } from "@/types/settings-types";

export default function EditProfile({
  trigger,
  profileData,
  onProfileUpdate,
}: EditProfileProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editProfileData, setEditProfileData] =
    useState<ProfileData>(profileData);

  const handleProfileUpdate = () => {
    onProfileUpdate(editProfileData);
    setIsOpen(false);
    alert("Profile updated successfully!");
  };

  const handleCancel = () => {
    setEditProfileData(profileData); // Reset to original data
    setIsOpen(false);
  };

  const updateField = (field: keyof ProfileData, value: string) => {
    setEditProfileData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update personal details to stay up-to-date.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">First name</Label>
              <Input
                value={editProfileData.firstName}
                onChange={(e) => updateField("firstName", e.target.value)}
                placeholder="First Name"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Last name</Label>
              <Input
                value={editProfileData.lastName}
                onChange={(e) => updateField("lastName", e.target.value)}
                placeholder="Last Name"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Email</Label>
              <Input
                type="email"
                value={editProfileData.email}
                onChange={(e) => updateField("email", e.target.value)}
                placeholder="Email Address"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Date of birth</Label>
              <div className="relative">
                <Input
                  type="date"
                  value={editProfileData.dateOfBirth}
                  onChange={(e) => updateField("dateOfBirth", e.target.value)}
                  className="pr-10"
                />
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>

            <div className="space-y-2 w-full">
              <Label className="text-sm font-medium">Category</Label>
              <Select
                value={editProfileData.category}
                onValueChange={(value) => updateField("category", value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Business">Business</SelectItem>
                  <SelectItem value="Personal">Personal</SelectItem>
                  <SelectItem value="Education">Education</SelectItem>
                  <SelectItem value="Healthcare">Healthcare</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 w-full">
              <Label className="text-sm font-medium">Role</Label>
              <Select
                value={editProfileData.role}
                onValueChange={(value) => updateField("role", value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Human Resource Manager">
                    Human Resource Manager
                  </SelectItem>
                  <SelectItem value="Software Developer">
                    Software Developer
                  </SelectItem>
                  <SelectItem value="Project Manager">
                    Project Manager
                  </SelectItem>
                  <SelectItem value="Designer">Designer</SelectItem>
                  <SelectItem value="Marketing Manager">
                    Marketing Manager
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter className="w-full flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            className="w-full sm:w-[206px] bg-gray-20"
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <Button
            onClick={handleProfileUpdate}
            className="flex items-center gap-2 w-full sm:w-[206px]"
          >
            <Upload className="h-4 w-4" />
            Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
