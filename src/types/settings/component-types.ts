export interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  category: string;
  role: string;
}

export interface AccountSettingsProps {
  profileData: ProfileData;
  onProfileUpdate: (updatedData: ProfileData) => void;
  onLogout: () => void;
}

export interface ChangePasswordProps {
  trigger: React.ReactNode;
}

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

