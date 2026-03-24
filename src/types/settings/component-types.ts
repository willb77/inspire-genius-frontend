export type GenderOption = "Male" | "Female" | "Non-Binary" | "N/A" | "";

export interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  category: string;
  role: string;
  additionalInfo?: string;
  passwordChangeAllowed?: boolean;
  gender?: GenderOption;
  ethnicity?: string;
  culturalAffinity?: string;
}

export interface AccountSettingsProps {
  profileData: ProfileData;
  onProfileUpdate: (updatedData: ProfileData) => void;
  onLogout: () => void;
  onChangePassword?: (payload: { current_password: string; new_password: string; confirm_password: string }) => Promise<void> | void;
  isChangingPassword?: boolean;
  isProfileLoading?: boolean;
  isUpdatingProfile?: boolean;
  changePasswordOpen?: boolean;
  onChangePasswordOpenChange?: (open: boolean) => void;
  changePasswordForm?: import("react-hook-form").UseFormReturn<ChangePasswordFormValues>;
  editProfileOpen?: boolean;
  onEditProfileOpenChange?: (open: boolean) => void;
  editProfileForm?: import("react-hook-form").UseFormReturn<EditProfileFormValues>;
  onEditProfileSubmit?: (values: EditProfileFormValues) => Promise<void> | void;
  passwordChangeAllowed?: boolean;
}

export interface ChangePasswordProps {
  trigger: React.ReactNode;
  onSubmit?: (payload: { current_password: string; new_password: string; confirm_password: string }) => Promise<void> | void;
  isSubmitting?: boolean;
}

export type ChangePasswordFormValues = {
  current_password: string;
  new_password: string;
  confirm_password: string;
};

export type EditProfileFormValues = {
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  additionalInfo: string;
  gender: GenderOption;
  ethnicity: string;
  culturalAffinity: string;
};

export interface EditProfileProps {
  trigger: React.ReactNode;
  profileData: ProfileData;
  onProfileUpdate: (updatedData: ProfileData) => void;
}

export interface NotificationSettingsProps {
  pushNotifications: boolean;
  updateNotifications: boolean;
  marketingNotifications: boolean;
  onPushNotificationsChange: (value: boolean) => void;
  onUpdateNotificationsChange: (value: boolean) => void;
  onMarketingNotificationsChange: (value: boolean) => void;
}

