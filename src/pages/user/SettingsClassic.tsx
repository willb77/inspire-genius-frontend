import UserLayout from "@/layouts/UserLayout";
import Settings from "@/components/shared/settings/Settings";

/**
 * Permanent escape hatch for the original (classic) Settings surface,
 * flag-independent. Mounted at /settings/classic — mirrors the
 * /settings/privacy/classic pattern. Forces `variant="classic"` so it renders
 * the pre-HomeV2 Settings regardless of the new_user_surfaces flag.
 */
export default function UserSettingsClassicPage() {
  return (
    <UserLayout>
      <Settings variant="classic" />
    </UserLayout>
  );
}
