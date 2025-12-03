  import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Edit, LockKeyhole, LogOut } from "lucide-react";
import type { AccountSettingsProps } from "@/types/settings";
import { Label } from "../ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import PasswordField from "@/components/shared/inputs/PasswordField";
import { DatePicker } from "@/components/ui/date-picker";
import { parse, isValid, format as formatDate } from "date-fns";
import { ROLES } from "@/constants/routes";

export default function AccountSettings({
  profileData,
  onLogout,
  onChangePassword,
  isChangingPassword,
  isProfileLoading,
  isUpdatingProfile,
  changePasswordOpen,
  onChangePasswordOpenChange,
  changePasswordForm,
  editProfileOpen,
  onEditProfileOpenChange,
  editProfileForm,
  onEditProfileSubmit,
}: AccountSettingsProps) {
  const displayDob = (() => {
    try {
      const raw = profileData?.dateOfBirth ?? "";
      if (!raw) return "";
      let d = parse(raw, "yyyy-MM-dd", new Date());
      if (!isValid(d)) d = new Date(raw);
      return isValid(d) ? formatDate(d, "dd LLL yyyy") : String(raw);
    } catch {
      return String(profileData?.dateOfBirth ?? "");
    }
  })();

  const form = changePasswordForm;
  const register = form?.register;
  const handleSubmit = form?.handleSubmit;
  const watch = form?.watch;
  const reset = form?.reset;
  const errors = form?.formState.errors as Record<string, { message?: string }> | undefined;
  const formSubmitting = form?.formState.isSubmitting ?? false;
  const newPasswordValue = watch ? watch("new_password") : "";

  // password visibility handled by PasswordField component

  const onValid = async (values: { current_password: string; new_password: string; confirm_password: string }) => {
    if (onChangePassword) {
      try {
        await onChangePassword(values);
      } catch {
        // keep dialog open on error
      }
    }
  };

  return (
    <Card className="shadow-none sm:shadow-sm">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <CardTitle className="text-lg font-semibold">
          Account Settings
        </CardTitle>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          {(profileData?.passwordChangeAllowed || profileData?.role === ROLES.SUPER_ADMIN) && <Button
            variant="outline"
            size="sm"
            disabled={false}
            className="flex items-center justify-center gap-2 w-full sm:w-auto bg-gray-20 hover:bg-gray-30"
            onClick={() => onChangePasswordOpenChange?.(true)}
          >
            <LockKeyhole className="h-4 w-4" />
            Change Password?
          </Button>}
          <Button
            size="sm"
            disabled={false}
            className="flex items-center justify-center gap-2 w-full sm:w-auto md:min-w-32 bg-blue-10 text-primary hover:bg-blue-20"
            onClick={() => onEditProfileOpenChange?.(true)}
          >
            <Edit className="h-4 w-4" />
            Edit
          </Button>

          <Button
            variant="destructive"
            size="sm"
            onClick={onLogout}
            disabled={true}
            className="hidden items-center justify-center gap-2 w-full sm:w-auto bg-[#FFEBEC] text-[#DE3B40] hover:bg-[#FFEBEC]"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Edit Profile Dialog */}
        <Dialog open={!!editProfileOpen} onOpenChange={onEditProfileOpenChange}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Profile</DialogTitle>
              <DialogDescription>Update personal details to stay up-to-date.</DialogDescription>
            </DialogHeader>
            {editProfileForm ? (
              <form
                className="space-y-6"
                onSubmit={editProfileForm.handleSubmit(async (values) => {
                  let nextDob = values?.dateOfBirth ?? "";
                  if (typeof nextDob === "string" && nextDob) {
                    const d = parse(nextDob, "d LLL yyyy", new Date());
                    if (isValid(d)) nextDob = formatDate(d, "yyyy-MM-dd");
                  }
                  await onEditProfileSubmit?.({ ...values, dateOfBirth: nextDob });
                })}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">First name</Label>
                    <Input
                      {...editProfileForm.register("firstName", {
                        required: "First name is required",
                        maxLength: { value: 50, message: "First name must be at most 50 characters" },
                        validate: (v) => (v?.trim()?.length ? true : "First name is required"),
                      })}
                      placeholder="First Name"
                    />
                    {editProfileForm.formState?.errors?.firstName?.message ? (
                      <p className="text-xs text-red-500">{String(editProfileForm.formState.errors.firstName.message)}</p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Last name</Label>
                    <Input
                      {...editProfileForm.register("lastName", {
                        required: "Last name is required",
                        maxLength: { value: 50, message: "Last name must be at most 50 characters" },
                        validate: (v) => (v?.trim()?.length ? true : "Last name is required"),
                      })}
                      placeholder="Last Name"
                    />
                    {editProfileForm.formState?.errors?.lastName?.message ? (
                      <p className="text-xs text-red-500">{String(editProfileForm.formState.errors.lastName.message)}</p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Email</Label>
                    <Input
                      type="email"
                      {...editProfileForm.register("email")}
                      disabled
                      placeholder="Email Address"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Date of birth</Label>
                    <DatePicker
                      value={editProfileForm.watch("dateOfBirth")}
                      onChange={(v) => editProfileForm.setValue("dateOfBirth", v, { shouldDirty: true, shouldTouch: true })}
                      placeholder="Date of Birth"
                      minDate={new Date(1900, 0, 1)}
                      maxDate={(() => { const t = new Date(); return new Date(t.getFullYear() - 13, t.getMonth(), t.getDate()); })()}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-sm font-medium">Additional info</Label>
                    <Textarea
                      rows={4}
                      {...editProfileForm.register("additionalInfo", {
                        maxLength: { value: 500, message: "Additional info must be at most 500 characters" },
                      })}
                      placeholder="Tell us more about you..."
                    />
                    {editProfileForm.formState?.errors?.additionalInfo?.message ? (
                      <p className="text-xs text-red-500">{String(editProfileForm.formState.errors.additionalInfo.message)}</p>
                    ) : null}
                  </div>
                </div>
                <DialogFooter className="w-full flex flex-col sm:flex-row gap-2">
                  <Button
                    variant="outline"
                    className="w-full sm:w-[206px] bg-gray-20"
                    type="button"
                    onClick={() => {
                      onEditProfileOpenChange?.(false);
                      editProfileForm.reset({
                        firstName: profileData.firstName,
                        lastName: profileData.lastName,
                        email: profileData.email,
                        dateOfBirth: profileData.dateOfBirth,
                        additionalInfo: profileData.additionalInfo ?? "",
                      });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="flex items-center gap-2 w-full sm:w-[206px]" disabled={!!isUpdatingProfile}>
                    {isUpdatingProfile ? "Saving..." : "Save"}
                  </Button>
                </DialogFooter>
              </form>
            ) : null}
          </DialogContent>
        </Dialog>
        <Dialog open={!!changePasswordOpen} onOpenChange={onChangePasswordOpenChange}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Change Password</DialogTitle>
              <DialogDescription className="mb-4">Update password to secure your account.</DialogDescription>
            </DialogHeader>
            {form && register && handleSubmit ? (
              <form className="space-y-4" onSubmit={handleSubmit(onValid)}>
                <PasswordField
                  placeholder="Enter Current Password"
                  {...register("current_password", { required: "Current password is required" })}
                  error={errors?.current_password?.message}
                />

                <PasswordField
                  placeholder="Enter New Password"
                  {...register("new_password", { required: "New password is required", minLength: { value: 6, message: "Password must be at least 6 characters long" } })}
                  error={errors?.new_password?.message}
                />

                <PasswordField
                  placeholder="Confirm New Password"
                  {...register("confirm_password", { required: "Please confirm your new password", validate: (val) => val === newPasswordValue || "Passwords do not match" })}
                  error={errors?.confirm_password?.message}
                />

                <DialogFooter className="flex flex-col sm:flex-row gap-2 justify-between w-full">
                  <Button
                    variant="outline"
                    className="w-full sm:w-[48%]"
                    type="button"
                    onClick={() => {
                      onChangePasswordOpenChange?.(false);
                      reset?.();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button className="w-full sm:w-[48%]" type="submit" disabled={!!isChangingPassword || formSubmitting}>
                    {isChangingPassword || formSubmitting ? "Saving..." : "Save Changes"}
                  </Button>
                </DialogFooter>
              </form>
            ) : null}
          </DialogContent>
        </Dialog>
        <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
          {/* Form Fields */}
          <div className="flex-1 w-full grid grid-cols-1 lg:grid-cols-2 gap-4 text-left">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                First name
              </Label>
              {isProfileLoading ? (
                <Skeleton className="h-9 w-full" />
              ) : (
                <Input value={profileData.firstName} readOnly />
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Last name
              </Label>
              {isProfileLoading ? (
                <Skeleton className="h-9 w-full" />
              ) : (
                <Input value={profileData.lastName} readOnly />
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Email
              </Label>
              {isProfileLoading ? (
                <Skeleton className="h-9 w-full" />
              ) : (
                <Input value={profileData.email} readOnly />
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Date of birth
              </Label>
              {isProfileLoading ? (
                <Skeleton className="h-9 w-full" />
              ) : (
                <Input value={displayDob} readOnly />
              )}
            </div>
            <div className="space-y-2 lg:col-span-2">
              <Label className="text-sm font-medium text-gray-700">Additional info</Label>
              {isProfileLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : (
                <Textarea placeholder="Add additional info" value={profileData.additionalInfo ?? ""} readOnly rows={4} />
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

