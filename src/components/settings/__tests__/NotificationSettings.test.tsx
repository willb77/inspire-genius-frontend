/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent } from "@testing-library/react";
import NotificationSettings from "@/components/settings/NotificationSettings";

/* MOCK UI COMPONENTS */
jest.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({ onCheckedChange, checked }: any) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
    />
  ),
}));

jest.mock("@/components/ui/switch", () => ({
  Switch: ({ onCheckedChange, checked }: any) => (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange?.(!checked)}
    />
  ),
}));

describe("NotificationSettings", () => {
  const props = {
    pushNotifications: true,
    updateNotifications: false,
    marketingNotifications: true,
    onPushNotificationsChange: jest.fn(),
    onUpdateNotificationsChange: jest.fn(),
    onMarketingNotificationsChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders notification settings title", () => {
    render(<NotificationSettings {...props} />);
    expect(
      screen.getByText("Notifications Settings")
    ).toBeInTheDocument();
  });

  test("calls push notification handler", () => {
    render(<NotificationSettings {...props} />);

    fireEvent.click(screen.getByRole("switch"));

    expect(props.onPushNotificationsChange).toHaveBeenCalledWith(false);
  });

  test("calls update notification handler with boolean", () => {
    render(<NotificationSettings {...props} />);

    const checkbox = screen.getAllByRole("checkbox")[0];
    fireEvent.click(checkbox);

    expect(props.onUpdateNotificationsChange).toHaveBeenCalledWith(true);
  });

  test("calls marketing notification handler with boolean", () => {
    render(<NotificationSettings {...props} />);

    const checkbox = screen.getAllByRole("checkbox")[1];
    fireEvent.click(checkbox);

    expect(props.onMarketingNotificationsChange).toHaveBeenCalledWith(false);
  });
});
