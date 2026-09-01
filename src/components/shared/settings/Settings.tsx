import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SearchBar from "@/components/shared/SearchBar";
import AccountSettings from "@/components/settings/AccountSettings";
import { useMe } from "@/hooks/user/useMe";
import { useChangePassword } from "@/hooks/user/useChangePassword";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import type {
  ChangePasswordFormValues,
  EditProfileFormValues,
  GenderOption,
  ProfileData,
} from "@/types/settings";
import { useUpdateProfile } from "@/hooks/onboarding/useUpdateProfile";
import { useAuth } from "@/context/useAuth";
import { ROLES } from "@/constants/routes";
import { Link } from "react-router-dom";
import { NotificationPreferences } from "@/components/NotificationPreferences";
import AgentEngineToggle from "@/components/settings/AgentEngineToggle";
import PrivacySettings from "@/components/settings/PrivacySettings";
import RetentionSettings from "@/components/settings/RetentionSettings";
import PersonalDataSettings from "@/components/shared/settings/PersonalDataSettings";
import AssessmentsSettings from "@/components/shared/settings/AssessmentsSettings";
import { V2Panel, SectionLabel } from "@/components/v2";
import { isNewUserSurfacesEnabled } from "@/lib/surfaceFlags";
import SurveysSettingsCard from "@/components/settings/SurveysSettingsCard";

export type SettingsVariant = "classic" | "v2";

/**
 * Which Settings surface is being rendered.
 *
 * All six role pages mount this same component, so a role check alone
 * cannot distinguish "the super-admin's own Administration settings"
 * from "the user Settings page, viewed by someone who happens to be a
 * super-admin". Operator-only tiles need the latter distinction: a
 * super-admin visiting /settings is looking at the USER surface and
 * should see what a user sees.
 */
export type SettingsSurface = "role" | "administration";

/**
 * Shared Settings surface (used by all 6 role pages).
 *
 * `variant="v2"` re-skins the page to the HomeV2 design system: the cream
 * `<V2Panel>` page frame, a visible eyebrow + serif "Settings" heading (the
 * classic header is intentionally `invisible`), and orange-accent legal links.
 * Every child settings card, hook, form and role-gate is shared and unchanged
 * — only the page frame + header + link accent differ. When no `variant` is
 * passed the surface resolves from the `new_user_surfaces` flag, so all six
 * role Settings pages pick up V2 together (flag OFF → classic). The
 * `/settings/classic` route forces `variant="classic"` as a permanent escape
 * hatch.
 */
export default function Settings({
  variant,
  surface = "role",
}: {
  variant?: SettingsVariant;
  surface?: SettingsSurface;
} = {}) {
  const isV2 = variant ? variant === "v2" : isNewUserSurfacesEnabled();
  const { user, markFullName } = useAuth();
  const role = user?.role;
  const { data: meResp, isPending: meLoading } = useMe<{
    sub: string;
    groups: string[];
    user_role: string;
    is_onboarded: string;
    email: string;
    first_name?: string;
    last_name?: string;
    full_name?: string;
    date_of_birth?: string;
    additional_info?: string;
    is_password_change_allowed?: boolean;
    role?: string;
    gender?: string;
    ethnicity?: string;
    cultural_affinity?: string;
  }>();

  const changePasswordForm = useForm<ChangePasswordFormValues>({
    defaultValues: {
      current_password: "",
      new_password: "",
      confirm_password: "",
    },
  });
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const editProfileForm = useForm<EditProfileFormValues>({
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      dateOfBirth: "",
      additionalInfo: "",
      gender: "",
      ethnicity: "",
      culturalAffinity: "",
    },
  });
  const [editProfileOpen, setEditProfileOpen] = useState(false);

  const changePasswordMutation = useChangePassword();

  const upsertProfileMutation = useUpdateProfile();

  const handleChangePassword = async (payload: {
    current_password: string;
    new_password: string;
    confirm_password: string;
  }) => {
    changePasswordMutation.mutate(payload, {
      onSuccess: (response) => {
        toast.success(response.message ?? "Password changed successfully");
        setChangePasswordOpen(false);
        changePasswordForm.reset();
      },
      onError: (error) => {
        const msg =
          (
            error as {
              response?: { data?: { message?: string } };
              message?: string;
            }
          ).response?.data?.message ??
          error.message ??
          "Failed to change password";
        toast.error(msg);
      },
    });
  };

  // Profile data
  const [profileData, setProfileData] = useState<ProfileData>({
    firstName: "",
    lastName: "",
    email: "",
    dateOfBirth: "",
    category: "",
    role: "",
  });

  useEffect(() => {
    const data = meResp?.data;
    if (!data) return;
    const mapped = {
      email: data.email ?? "",
      firstName: data.first_name ?? "",
      lastName: data.last_name ?? "",
      dateOfBirth: data.date_of_birth ?? "",
      additionalInfo: data.additional_info ?? "",
      passwordChangeAllowed: data.is_password_change_allowed ?? false,
      role: data.role ?? "",
      gender: (data.gender ?? "") as GenderOption,
      ethnicity: data.ethnicity ?? "",
      culturalAffinity: data.cultural_affinity ?? "",
    };
    setProfileData((prev) => ({
      ...prev,
      ...mapped,
    }));
    const current = editProfileForm.getValues();
    editProfileForm.reset({
      ...current,
      ...mapped,
    });
  }, [meResp, editProfileForm]);

  const handleProfileUpdate = (updatedData: typeof profileData) => {
    setProfileData(updatedData);
  };

  const handleEditProfileSubmit = async (values: EditProfileFormValues) => {
    const payload = {
      first_name: values.firstName,
      last_name: values.lastName,
      date_of_birth: values.dateOfBirth,
      additional_info: values.additionalInfo || undefined,
      gender: values.gender || undefined,
      ethnicity: values.ethnicity || undefined,
      cultural_affinity: values.culturalAffinity || undefined,
    };
    upsertProfileMutation.mutate(payload, {
      onSuccess: (resp) => {
        toast.success(resp?.message ?? "Profile updated successfully");
        setProfileData((prev) => ({
          ...prev,
          firstName: values.firstName,
          lastName: values.lastName,
          dateOfBirth: values.dateOfBirth,
          additionalInfo: values.additionalInfo,
          gender: values.gender,
          ethnicity: values.ethnicity,
          culturalAffinity: values.culturalAffinity,
          email: prev.email,
        }));
        const fullName = `${values.firstName} ${values.lastName}`.trim();
        if (fullName) {
          markFullName(fullName);
        }
        setEditProfileOpen(false);
        editProfileForm.reset(values);
      },
      onError: (error) => {
        const msg =
          (
            error as {
              response?: { data?: { message?: string } };
              message?: string;
            }
          ).response?.data?.message ??
          (error as Error).message ??
          "Failed to update profile";
        toast.error(msg);
      },
    });
  };

  const handleLogout = () => {
    if (confirm("Are you sure you want to logout?")) {
      alert("Logged out successfully!");
    }
  };

  // Legal links: orange brand accent in V2, the original blue in classic.
  const legalLinkClass = isV2
    ? "text-accent-orange-dark hover:text-accent-orange text-sm underline"
    : "text-blue-600 hover:text-blue-800 text-sm underline";

  const content = (
    <>
        {isV2 ? (
          <div data-testid="settings-v2-header">
            <SectionLabel>Account &amp; Preferences</SectionLabel>
            <h1 className="font-serif text-[22px] leading-tight tracking-tight text-ink">
              Settings
            </h1>
          </div>
        ) : (
          <div className="invisible mb-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
            <SearchBar />
          </div>
        )}

        {/* Account Settings Card */}
        <div data-tour="settings-account">
          <AccountSettings
            profileData={profileData}
            onProfileUpdate={handleProfileUpdate}
            onLogout={handleLogout}
            onChangePassword={handleChangePassword}
            isChangingPassword={changePasswordMutation.isPending}
            changePasswordOpen={changePasswordOpen}
            onChangePasswordOpenChange={setChangePasswordOpen}
            changePasswordForm={changePasswordForm}
            editProfileOpen={editProfileOpen}
            onEditProfileOpenChange={setEditProfileOpen}
            editProfileForm={editProfileForm}
            onEditProfileSubmit={handleEditProfileSubmit}
            isProfileLoading={!!meLoading}
            isUpdatingProfile={!!upsertProfileMutation.isPending}
          />
        </div>

        {/* Personal Data — structured profile facts (G6). User-facing only. */}
        {role === ROLES.USER && (
          <div data-tour="settings-personal-data">
            <PersonalDataSettings />
          </div>
        )}

        {/* Other Assessments — prior DISC / Big Five / MBTI entries (G6).
            Sits between Personal Data and Notifications per Option C plan. */}
        {role === ROLES.USER && (
          <div data-tour="settings-other-assessments">
            <AssessmentsSettings />
          </div>
        )}

        {/* My Workspace — Surveys shared with the user's organization. The
            user-role entry point (the left nav is frozen for that role); also
            shown to super-admin so the owner can see it while testing. */}
        {(role === ROLES.USER || role === ROLES.SUPER_ADMIN) && (
          <div data-tour="settings-surveys">
            <SurveysSettingsCard />
          </div>
        )}
        {/* The second "Push Notifications" card was removed here (2026-09-01).
            It rendered a Switch hard-coded `disabled={true}` plus two disabled
            checkboxes, backed by three useState values nothing read and
            nothing persisted — a control that could not be operated and would
            not have done anything if it could. It also duplicated the title of
            the real <NotificationPreferences> card below, so Settings showed
            two "Push Notifications" sections, one of them permanently greyed
            out. The working card is the one below. */}

        {/* Agent Engine Routing — Administration surface only.
            The monolith is deprecated (2026-05-07) and production WS routing
            cannot reach it, so this toggle is an operator diagnostic, not a
            user preference. Gating on role alone was not enough: a super-admin
            opening /settings, /manager/settings etc. still saw it, because
            every role page mounts this same component. */}
        {role === ROLES.SUPER_ADMIN && surface === "administration" && (
          <div data-tour="settings-agent-engine">
            <AgentEngineToggle />
          </div>
        )}

        {/* Memory Retention (super-admin, company-admin, manager) — Term E P3 */}
        {(role === ROLES.SUPER_ADMIN
          || role === ROLES.COMPANY_ADMIN
          || role === ROLES.MANAGER) && (
          <div data-tour="settings-retention">
            <RetentionSettings />
          </div>
        )}

        {/* Browser Push Notification Preferences */}
        <div data-tour="settings-push-notifications">
          <NotificationPreferences />
        </div>

        {/* Privacy & Data Settings */}
        <div data-tour="settings-privacy">
          <PrivacySettings />
        </div>

        {/* Legal Card */}
        {role === ROLES.USER && (
          <Card className="shadow-sm">
            <CardHeader className="text-left">
              <CardTitle className="text-lg font-semibold">Legal</CardTitle>
            </CardHeader>
            <CardContent className="text-left">
              <div>
                <Link to="/terms" className={legalLinkClass}>
                  Terms of Use
                </Link>
                <br />
                <Link to="/privacy" className={legalLinkClass}>
                  Privacy Policy
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
    </>
  );

  return isV2 ? (
    <V2Panel>{content}</V2Panel>
  ) : (
    <div className="space-y-4">{content}</div>
  );
}
