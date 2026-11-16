import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "../ui/label";
import type { NotificationSettingsProps } from "@/types/settings";
import { useTranslation } from "react-i18next";

export default function NotificationSettings({
  pushNotifications,
  updateNotifications,
  marketingNotifications,
  onPushNotificationsChange,
  onUpdateNotificationsChange,
  onMarketingNotificationsChange,
}: NotificationSettingsProps) {
  const { t } = useTranslation("accountUi")
  return (
    <Card className="shadow-none sm:shadow-sm">
      <CardHeader className="text-left">
        <CardTitle className="text-lg font-semibold">
          {t("notificationSettings.notificationsSettings", { defaultValue: "Notifications Settings" })}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Push Notifications */}
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-left">{t("notificationSettings.pushNotifications", { defaultValue: "Push Notifications" })}</h4>
            <p className="text-xs text-gray-500">
              {t("notificationSettings.receivePushNotificationsOnYourDevice", { defaultValue: "Receive push notifications on your device" })}
            </p>
          </div>
          <Switch
            checked={pushNotifications}
            disabled={true}
            onCheckedChange={onPushNotificationsChange}
          />
        </div>

        {/* Notification Options */}
        <div className="space-y-4 pl-4">
          <div className="flex items-center space-x-3">
            <Checkbox
              id="update-notifications"
              disabled = {true}
              checked={updateNotifications}
              onCheckedChange={(checked) =>
                onUpdateNotificationsChange(!!checked)
              }
            />
            <Label
              htmlFor="update-notifications"
              className="text-sm font-medium"
            >
              {t("notificationSettings.updateMaintenanceNotification", { defaultValue: "Update / Maintenance Notification" })}
            </Label>
          </div>

          <div className="flex items-center space-x-3">
            <Checkbox
              disabled={true}
              id="marketing-notifications"
              checked={marketingNotifications}
              onCheckedChange={(checked) =>
                onMarketingNotificationsChange(!!checked)
              }
            />
            <Label
              htmlFor="marketing-notifications"
              className="text-sm font-medium"
            >
              {t("notificationSettings.marketingPromotionalNotifications", { defaultValue: "Marketing / Promotional Notifications" })}
            </Label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

