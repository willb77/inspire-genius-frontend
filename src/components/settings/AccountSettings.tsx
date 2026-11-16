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
import { PASSWORD_RULE_TEXT, passwordMeetsRule } from "@/lib/house/passwordRule";
import { PasswordChecklist } from "@/components/shared/house/PasswordChecklist";
import { DatePicker } from "@/components/ui/date-picker";
import { parse, isValid, format as formatDate } from "date-fns";
import { ROLES } from "@/constants/routes";
import type { EditProfileFormValues, GenderOption } from "@/types/settings";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "react-i18next";

function formatDobForDisplay(rawDob: unknown): string {
  try {
    const raw = String(rawDob ?? "");
    if (!raw) return "";
    let d = parse(raw, "yyyy-MM-dd", new Date());
    if (!isValid(d)) d = new Date(raw);
    return isValid(d) ? formatDate(d, "dd LLL yyyy") : raw;
  } catch {
    return String(rawDob ?? "");
  }
}

function normalizeDobForSubmit(nextDob: string): string {
  if (!nextDob) return "";
  const d = parse(nextDob, "d LLL yyyy", new Date());
  return isValid(d) ? formatDate(d, "yyyy-MM-dd") : nextDob;
}

function getMaxDobDate(): Date {
  const t = new Date();
  return new Date(t.getFullYear() - 13, t.getMonth(), t.getDate());
}

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
  const { t } = useTranslation("accountUi")
  const displayDob = formatDobForDisplay(profileData?.dateOfBirth);

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
    if (!onChangePassword) return;
    try {
      await onChangePassword(values);
    } catch {
      // keep dialog open on error
    }
  };

  const handleEditProfileSubmitLocal = async (values: EditProfileFormValues) => {
    const nextDob = normalizeDobForSubmit(values.dateOfBirth);
    await onEditProfileSubmit?.({ ...values, dateOfBirth: nextDob });
  };

  const handleEditProfileCancel = () => {
    onEditProfileOpenChange?.(false);
    editProfileForm?.reset({
      firstName: profileData.firstName,
      lastName: profileData.lastName,
      email: profileData.email,
      dateOfBirth: profileData.dateOfBirth,
      additionalInfo: profileData.additionalInfo ?? "",
      gender: profileData.gender ?? "",
      ethnicity: profileData.ethnicity ?? "",
      culturalAffinity: profileData.culturalAffinity ?? "",
    });
  };

  const handleChangePasswordCancel = () => {
    onChangePasswordOpenChange?.(false);
    reset?.();
  };

  return (
    <Card className="shadow-none sm:shadow-sm">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <CardTitle className="text-lg font-semibold">
          {t("accountSettings.accountSettings", { defaultValue: "Account Settings" })}
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
            {t("accountSettings.changePassword", { defaultValue: "Change Password?" })}
          </Button>}
          <Button
            size="sm"
            disabled={false}
            className="flex items-center justify-center gap-2 w-full sm:w-auto md:min-w-32 bg-blue-10 text-primary hover:bg-blue-20"
            onClick={() => onEditProfileOpenChange?.(true)}
          >
            <Edit className="h-4 w-4" />
            {t("accountSettings.edit", { defaultValue: "Edit" })}
          </Button>

          <Button
            variant="destructive"
            size="sm"
            onClick={onLogout}
            disabled={true}
            className="hidden items-center justify-center gap-2 w-full sm:w-auto bg-[#FFEBEC] text-[#DE3B40] hover:bg-[#FFEBEC]"
          >
            <LogOut className="h-4 w-4" />
            {t("accountSettings.logout", { defaultValue: "Logout" })}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Edit Profile Dialog */}
        <Dialog open={!!editProfileOpen} onOpenChange={onEditProfileOpenChange}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t("accountSettings.editProfile", { defaultValue: "Edit Profile" })}</DialogTitle>
              <DialogDescription>{t("accountSettings.updatePersonalDetailsToStayUp", { defaultValue: "Update personal details to stay up-to-date." })}</DialogDescription>
            </DialogHeader>
            {editProfileForm ? (
              <form
                className="space-y-6"
                onSubmit={editProfileForm.handleSubmit(handleEditProfileSubmitLocal)}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">{t("accountSettings.firstName", { defaultValue: "First name" })}</Label>
                    <Input
                      {...editProfileForm.register("firstName", {
                        required: t("accountSettings.firstNameIsRequired", { defaultValue: "First name is required" }),
                        maxLength: { value: 50, message: t("accountSettings.firstNameMustBeAtMost50", { defaultValue: "First name must be at most 50 characters" }) },
                        validate: (v) => (v?.trim()?.length ? true : t("accountSettings.firstNameIsRequired", { defaultValue: "First name is required" })),
                      })}
                      placeholder={t("accountSettings.firstName2", { defaultValue: "First Name" })}
                    />
                    {editProfileForm.formState?.errors?.firstName?.message ? (
                      <p className="text-xs text-red-500">{String(editProfileForm.formState.errors.firstName.message)}</p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">{t("accountSettings.lastName", { defaultValue: "Last name" })}</Label>
                    <Input
                      {...editProfileForm.register("lastName", {
                        required: t("accountSettings.lastNameIsRequired", { defaultValue: "Last name is required" }),
                        maxLength: { value: 50, message: t("accountSettings.lastNameMustBeAtMost50", { defaultValue: "Last name must be at most 50 characters" }) },
                        validate: (v) => (v?.trim()?.length ? true : t("accountSettings.lastNameIsRequired", { defaultValue: "Last name is required" })),
                      })}
                      placeholder={t("accountSettings.lastName2", { defaultValue: "Last Name" })}
                    />
                    {editProfileForm.formState?.errors?.lastName?.message ? (
                      <p className="text-xs text-red-500">{String(editProfileForm.formState.errors.lastName.message)}</p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">{t("accountSettings.email", { defaultValue: "Email" })}</Label>
                    <Input
                      type="email"
                      {...editProfileForm.register("email")}
                      disabled
                      placeholder={t("accountSettings.emailAddress", { defaultValue: "Email Address" })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">{t("accountSettings.dateOfBirth", { defaultValue: "Date of birth" })}</Label>
                    <DatePicker
                      value={editProfileForm.watch("dateOfBirth")}
                      onChange={(v) => editProfileForm.setValue("dateOfBirth", v, { shouldDirty: true, shouldTouch: true })}
                      placeholder={t("accountSettings.dateOfBirth2", { defaultValue: "Date of Birth" })}
                      minDate={new Date(1900, 0, 1)}
                      maxDate={getMaxDobDate()}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-sm font-medium">{t("accountSettings.additionalInfo", { defaultValue: "Additional info" })}</Label>
                    <Textarea
                      rows={6}
                      {...editProfileForm.register("additionalInfo", {
                        maxLength: { value: 500, message: t("accountSettings.additionalInfoMustBeAtMost500", { defaultValue: "Additional info must be at most 500 characters" }) },
                      })}
                      placeholder={t("accountSettings.tellUsMoreAboutYou", { defaultValue: "Tell us more about you..." })}
                    />
                    {editProfileForm.formState?.errors?.additionalInfo?.message ? (
                      <p className="text-xs text-red-500">{String(editProfileForm.formState.errors.additionalInfo.message)}</p>
                    ) : null}
                  </div>

                  {/* Demographics Section */}
                  <div className="md:col-span-2 pt-2">
                    <h3 className="text-sm font-semibold text-gray-700 mb-1">{t("accountSettings.demographics", { defaultValue: "Demographics" })} <span className="text-xs font-normal text-muted-foreground">{t("accountSettings.optional", { defaultValue: "(optional)" })}</span></h3>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">{t("accountSettings.gender", { defaultValue: "Gender" })}</Label>
                    <Select
                      value={editProfileForm.watch("gender") || ""}
                      onValueChange={(v) => editProfileForm.setValue("gender", v as GenderOption, { shouldDirty: true })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t("accountSettings.selectGender", { defaultValue: "Select gender" })} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">{t("accountSettings.male", { defaultValue: "Male" })}</SelectItem>
                        <SelectItem value="Female">{t("accountSettings.female", { defaultValue: "Female" })}</SelectItem>
                        <SelectItem value="Non-Binary">{t("accountSettings.nonBinary", { defaultValue: "Non-Binary" })}</SelectItem>
                        <SelectItem value="N/A">{t("accountSettings.preferNotToSay", { defaultValue: "Prefer not to say" })}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">{t("accountSettings.ethnicity", { defaultValue: "Ethnicity" })}</Label>
                    <Input
                      {...editProfileForm.register("ethnicity", {
                        maxLength: { value: 100, message: t("accountSettings.ethnicityMustBeAtMost100", { defaultValue: "Ethnicity must be at most 100 characters" }) },
                      })}
                      placeholder={t("accountSettings.eGHispanicAsianEtc", { defaultValue: "e.g. Hispanic, Asian, etc." })}
                    />
                    {editProfileForm.formState?.errors?.ethnicity?.message ? (
                      <p className="text-xs text-red-500">{String(editProfileForm.formState.errors.ethnicity.message)}</p>
                    ) : null}
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-sm font-medium">{t("accountSettings.culturalAffinity", { defaultValue: "Cultural Affinity" })}</Label>
                    <Input
                      {...editProfileForm.register("culturalAffinity", {
                        maxLength: { value: 200, message: t("accountSettings.culturalAffinityMustBeAtMost200", { defaultValue: "Cultural affinity must be at most 200 characters" }) },
                      })}
                      placeholder={t("accountSettings.eGCulturalBackgroundTraditionsEtc", { defaultValue: "e.g. cultural background, traditions, etc." })}
                    />
                    {editProfileForm.formState?.errors?.culturalAffinity?.message ? (
                      <p className="text-xs text-red-500">{String(editProfileForm.formState.errors.culturalAffinity.message)}</p>
                    ) : null}
                  </div>
                </div>
                <DialogFooter className="w-full flex flex-col sm:flex-row gap-2">
                  <Button
                    variant="outline"
                    className="w-full sm:w-[206px] bg-gray-20"
                    type="button"
                    onClick={handleEditProfileCancel}
                  >
                    {t("accountSettings.cancel", { defaultValue: "Cancel" })}
                  </Button>
                  <Button type="submit" className="flex items-center gap-2 w-full sm:w-[206px]" disabled={!!isUpdatingProfile}>
                    {isUpdatingProfile ? t("accountSettings.saving", { defaultValue: "Saving..." }) : t("accountSettings.save", { defaultValue: "Save" })}
                  </Button>
                </DialogFooter>
              </form>
            ) : null}
          </DialogContent>
        </Dialog>
        <Dialog open={!!changePasswordOpen} onOpenChange={onChangePasswordOpenChange}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t("accountSettings.changePassword2", { defaultValue: "Change Password" })}</DialogTitle>
              <DialogDescription className="mb-4">{t("accountSettings.updatePasswordToSecureYourAccount", { defaultValue: "Update password to secure your account." })}</DialogDescription>
            </DialogHeader>
            {form && register && handleSubmit ? (
              <form className="space-y-4" onSubmit={handleSubmit(onValid)}>
                <PasswordField
                  placeholder={t("accountSettings.enterCurrentPassword", { defaultValue: "Enter Current Password" })}
                  {...register("current_password", { required: t("accountSettings.currentPasswordIsRequired", { defaultValue: "Current password is required" }) })}
                  error={errors?.current_password?.message}
                />

                <PasswordField
                  placeholder={t("accountSettings.enterNewPassword", { defaultValue: "Enter New Password" })}
                  {...register("new_password", { required: t("accountSettings.newPasswordIsRequired", { defaultValue: "New password is required" }), validate: (val) => passwordMeetsRule(val) || PASSWORD_RULE_TEXT })}
                  error={errors?.new_password?.message}
                />
                {newPasswordValue && !passwordMeetsRule(newPasswordValue) && (
                  <PasswordChecklist password={newPasswordValue} />
                )}

                <PasswordField
                  placeholder={t("accountSettings.confirmNewPassword", { defaultValue: "Confirm New Password" })}
                  {...register("confirm_password", { required: t("accountSettings.pleaseConfirmYourNewPassword", { defaultValue: "Please confirm your new password" }), validate: (val) => val === newPasswordValue || t("accountSettings.passwordsDoNotMatch", { defaultValue: "Passwords do not match" }) })}
                  error={errors?.confirm_password?.message}
                />

                <DialogFooter className="flex flex-col sm:flex-row gap-2 justify-between w-full">
                  <Button
                    variant="outline"
                    className="w-full sm:w-[48%]"
                    type="button"
                    onClick={handleChangePasswordCancel}
                  >
                    {t("accountSettings.cancel", { defaultValue: "Cancel" })}
                  </Button>
                  <Button className="w-full sm:w-[48%]" type="submit" disabled={!!isChangingPassword || formSubmitting}>
                    {isChangingPassword || formSubmitting ? t("accountSettings.saving", { defaultValue: "Saving..." }) : t("accountSettings.saveChanges", { defaultValue: "Save Changes" })}
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
                {t("accountSettings.firstName", { defaultValue: "First name" })}
              </Label>
              {isProfileLoading ? (
                <Skeleton className="h-9 w-full" />
              ) : (
                <Input value={profileData.firstName} readOnly />
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                {t("accountSettings.lastName", { defaultValue: "Last name" })}
              </Label>
              {isProfileLoading ? (
                <Skeleton className="h-9 w-full" />
              ) : (
                <Input value={profileData.lastName} readOnly />
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                {t("accountSettings.email", { defaultValue: "Email" })}
              </Label>
              {isProfileLoading ? (
                <Skeleton className="h-9 w-full" />
              ) : (
                <Input value={profileData.email} readOnly />
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                {t("accountSettings.dateOfBirth", { defaultValue: "Date of birth" })}
              </Label>
              {isProfileLoading ? (
                <Skeleton className="h-9 w-full" />
              ) : (
                <Input value={displayDob} readOnly />
              )}
            </div>
            <div className="space-y-2 lg:col-span-2">
              <Label className="text-sm font-medium text-gray-700">{t("accountSettings.additionalInfo", { defaultValue: "Additional info" })}</Label>
              {isProfileLoading ? (
                <Skeleton className="h-28 w-full" />
              ) : (
                <Textarea placeholder={t("accountSettings.addAdditionalInfo", { defaultValue: "Add additional info" })} value={profileData.additionalInfo ?? ""} readOnly rows={6} />
              )}
            </div>

            {/* Demographics */}
            {(profileData.gender || profileData.ethnicity || profileData.culturalAffinity) && (
              <>
                <div className="lg:col-span-2 pt-2">
                  <h3 className="text-sm font-semibold text-gray-700">{t("accountSettings.demographics", { defaultValue: "Demographics" })}</h3>
                </div>
                {profileData.gender ? (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">{t("accountSettings.gender", { defaultValue: "Gender" })}</Label>
                    <Input value={profileData.gender} readOnly />
                  </div>
                ) : null}
                {profileData.ethnicity ? (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">{t("accountSettings.ethnicity", { defaultValue: "Ethnicity" })}</Label>
                    <Input value={profileData.ethnicity} readOnly />
                  </div>
                ) : null}
                {profileData.culturalAffinity ? (
                  <div className="space-y-2 lg:col-span-2">
                    <Label className="text-sm font-medium text-gray-700">{t("accountSettings.culturalAffinity", { defaultValue: "Cultural Affinity" })}</Label>
                    <Input value={profileData.culturalAffinity} readOnly />
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

