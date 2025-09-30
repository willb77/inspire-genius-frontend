import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "../ui/label";

interface NotificationSettingsProps {
  pushNotifications: boolean;
  updateNotifications: boolean;
  marketingNotifications: boolean;
  onPushNotificationsChange: (value: boolean) => void;
  onUpdateNotificationsChange: (value: boolean) => void;
  onMarketingNotificationsChange: (value: boolean) => void;
}

export default function NotificationSettings({
  pushNotifications,
  updateNotifications,
  marketingNotifications,
  onPushNotificationsChange,
  onUpdateNotificationsChange,
  onMarketingNotificationsChange,
}: NotificationSettingsProps) {
  return (
    <Card className="shadow-none sm:shadow-sm">
      <CardHeader className="text-left">
        <CardTitle className="text-lg font-semibold">
          Notifications Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Push Notifications */}
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-left">Push Notifications</h4>
            <p className="text-xs text-gray-500">
              Receive push notifications on your device
            </p>
          </div>
          <Switch
            checked={pushNotifications}
            onCheckedChange={onPushNotificationsChange}
          />
        </div>

        {/* Notification Options */}
        <div className="space-y-4 pl-4">
          <div className="flex items-center space-x-3">
            <Checkbox
              id="update-notifications"
              checked={updateNotifications}
              onCheckedChange={(checked) =>
                onUpdateNotificationsChange(!!checked)
              }
            />
            <Label
              htmlFor="update-notifications"
              className="text-sm font-medium"
            >
              Update / Maintenance Notification
            </Label>
          </div>

          <div className="flex items-center space-x-3">
            <Checkbox
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
              Marketing / Promotional Notifications
            </Label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

