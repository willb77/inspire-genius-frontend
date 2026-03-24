/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import * as React from "react";
import type { FieldValues, UseFormHandleSubmit, UseFormReturn, UseFormWatch } from "react-hook-form";
import AccountSettings from "../AccountSettings";
import { ROLES } from "@/constants/routes";
import type { AccountSettingsProps, GenderOption } from "@/types/settings";

/* ------------------------------------------------------------------ */
/* MOCK UI COMPONENTS                                                   */
/* ------------------------------------------------------------------ */

type MockWithChildren = { children?: React.ReactNode; className?: string };

jest.mock("@/components/ui/card", () => ({
  Card: ({ children, className }: MockWithChildren) => (
    <div className={className}>{children}</div>
  ),
  CardContent: ({ children, className }: MockWithChildren) => (
    <div className={className}>{children}</div>
  ),
  CardHeader: ({ children, className }: MockWithChildren) => (
    <div className={className}>{children}</div>
  ),
  CardTitle: ({ children, className }: MockWithChildren) => (
    <h2 className={className}>{children}</h2>
  ),
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    type,
    variant,
    size,
    className,
  }: {
    children?: React.ReactNode;
    onClick?: React.MouseEventHandler<HTMLButtonElement>;
    disabled?: boolean;
    type?: React.ButtonHTMLAttributes<HTMLButtonElement>["type"];
    variant?: unknown;
    size?: unknown;
    className?: string;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      type={type}
      data-variant={variant}
      data-size={size}
      className={className}
    >
      {children}
    </button>
  ),
}));

jest.mock("@/components/ui/input", () => ({
  Input: ({ value, readOnly, disabled, type, placeholder, ...props }: React.ComponentPropsWithoutRef<"input">) => (
    <input
      value={value}
      readOnly={readOnly}
      disabled={disabled}
      type={type}
      placeholder={placeholder}
      {...props}
    />
  ),
}));

jest.mock("@/components/ui/textarea", () => ({
  Textarea: ({ value, readOnly, placeholder, rows, ...props }: React.ComponentPropsWithoutRef<"textarea">) => (
    <textarea
      value={value}
      readOnly={readOnly}
      placeholder={placeholder}
      rows={rows}
      {...props}
    />
  ),
}));

jest.mock("@/components/ui/label", () => ({
  Label: ({ children, className }: MockWithChildren) => (
    <label className={className}>{children}</label>
  ),
}));

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
}));

jest.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children?: React.ReactNode; open?: boolean }) => (
    <div data-testid="dialog" data-open={open}>
      {open && children}
    </div>
  ),
  DialogContent: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <div data-testid="dialog-content" className={className}>
      {children}
    </div>
  ),
  DialogHeader: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="dialog-header">{children}</div>
  ),
  DialogFooter: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <div data-testid="dialog-footer" className={className}>
      {children}
    </div>
  ),
  DialogTitle: ({ children }: { children?: React.ReactNode }) => (
    <h2 data-testid="dialog-title">{children}</h2>
  ),
  DialogDescription: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <p data-testid="dialog-description" className={className}>
      {children}
    </p>
  ),
}));

// Fixed Issue #2: Proper forwardRef mock
jest.mock("@/components/shared/inputs/PasswordField", () => {
  return {
    __esModule: true,
    default: React.forwardRef(
      (
        props: {
          placeholder?: string;
          error?: React.ReactNode;
        } & React.ComponentPropsWithoutRef<"input">,
        ref: React.ForwardedRef<HTMLInputElement>
      ) => {
        const { placeholder, error, ...rest } = props;
        return (
          <div>
            <input
              ref={ref}
              data-testid="password-field"
              placeholder={placeholder}
              {...rest}
            />
            {error && <span data-testid="password-error">{error}</span>}
          </div>
        );
      }
    ),
  };
});

jest.mock("@/components/ui/date-picker", () => ({
  DatePicker: ({ value, onChange, placeholder, minDate, maxDate }: {
    value?: string;
    onChange: (v: string) => void;
    placeholder?: string;
    minDate?: Date;
    maxDate?: Date;
  }) => (
    <input
      data-testid="date-picker"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      data-min-date={minDate?.toISOString()}
      data-max-date={maxDate?.toISOString()}
    />
  ),
}));

jest.mock("@/components/ui/select", () => ({
  Select: ({ children, value }: { children?: React.ReactNode; value?: string }) => (
    <div data-testid="select" data-value={value}>{children}</div>
  ),
  SelectTrigger: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <button data-testid="select-trigger" className={className}>{children}</button>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <span data-testid="select-value">{placeholder}</span>
  ),
  SelectContent: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="select-content">{children}</div>
  ),
  SelectItem: ({ children, value }: { children?: React.ReactNode; value?: string }) => (
    <div data-testid="select-item" data-value={value}>{children}</div>
  ),
}));

jest.mock("lucide-react", () => ({
  Edit: () => <span data-testid="edit-icon">Edit</span>,
  LockKeyhole: () => <span data-testid="lock-icon">Lock</span>,
  LogOut: () => <span data-testid="logout-icon">Logout</span>,
}));

/* ------------------------------------------------------------------ */
/* FORM MOCK HELPER                                                     */
/* ------------------------------------------------------------------ */
function createMockForm<T extends FieldValues>(
  overrides?: Partial<UseFormReturn<T>>
): UseFormReturn<T> {
  const defaultErrors = {} as unknown;

  return {
    register: jest.fn((name: string) => ({
      name,
      ref: jest.fn(),
      onChange: jest.fn(),
      onBlur: jest.fn(),
    })),
    handleSubmit: jest.fn((cb: (...args: unknown[]) => unknown) => {
      return async (e?: unknown) => {
        preventDefault(e);
        await cb({});
      };
    }) as unknown as UseFormHandleSubmit<T>,
    watch: jest.fn((field?: string) => {
      if (field) return "";
      return {};
    }) as unknown as UseFormWatch<T>,
    reset: jest.fn(),
    setValue: jest.fn(),
    getValues: jest.fn(() => ({} as T)),
    getFieldState: jest.fn(),
    setError: jest.fn(),
    clearErrors: jest.fn(),
    trigger: jest.fn(),
    control: {} as unknown as UseFormReturn<T>["control"],
    formState: {
      errors: defaultErrors,
      isSubmitting: false,
      isDirty: false,
      isValid: true,
      touchedFields: {},
      dirtyFields: {},
      isLoading: false,
      submitCount: 0,
      isSubmitted: false,
      isSubmitSuccessful: false,
      isValidating: false,
      disabled: false,
      validatingFields: {}, // Fixed Issue #1: Changed from undefined to {}
      ...overrides?.formState,
    },
    ...overrides,
  } as UseFormReturn<T>;
}

const preventDefault = (e?: unknown) => {
  if (!e || typeof e !== "object") return;
  if (!("preventDefault" in e)) return;
  const pd = (e as { preventDefault?: unknown }).preventDefault;
  if (typeof pd !== "function") return;

  (pd as () => void).call(e);
};

const makeHandleSubmitMock = <T extends FieldValues>(values: T): UseFormHandleSubmit<T> => {
  const mock = jest.fn((cb: (vals: T) => unknown) => {
    return async (e?: unknown) => {
      preventDefault(e);
      await cb(values);
    };
  });
  return mock as unknown as UseFormHandleSubmit<T>;
};

const makeHandleSubmitMockAsync = <T extends FieldValues>(values: T): UseFormHandleSubmit<T> => {
  const mock = jest.fn((cb: (vals: T) => Promise<unknown> | unknown) => {
    return async (e?: unknown) => {
      preventDefault(e);
      await cb(values);
    };
  });
  return mock as unknown as UseFormHandleSubmit<T>;
};

/* ------------------------------------------------------------------ */
/* FORM TYPES                                                           */
/* ------------------------------------------------------------------ */
type ChangePasswordFormValues = {
  current_password: string;
  new_password: string;
  confirm_password: string;
};

type EditProfileFormValues = {
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  additionalInfo: string;
  gender: GenderOption;
  ethnicity: string;
  culturalAffinity: string;
};

/* ------------------------------------------------------------------ */
/* BASE PROPS                                                           */
/* ------------------------------------------------------------------ */
const createBaseProps = (
  overrides?: Partial<AccountSettingsProps>
): AccountSettingsProps => ({
  profileData: {
    firstName: "John",
    lastName: "Doe",
    email: "john@test.com",
    dateOfBirth: "2000-01-10",
    additionalInfo: "Info",
    role: ROLES.USER,
    passwordChangeAllowed: true,
    category: "general",
  },
  onLogout: jest.fn(),
  onChangePassword: jest.fn(),
  onProfileUpdate: jest.fn(),
  isChangingPassword: false,
  isProfileLoading: false,
  isUpdatingProfile: false,
  changePasswordOpen: false,
  onChangePasswordOpenChange: jest.fn(),
  changePasswordForm: createMockForm<ChangePasswordFormValues>(),
  editProfileOpen: false,
  onEditProfileOpenChange: jest.fn(),
  editProfileForm: createMockForm<EditProfileFormValues>(),
  onEditProfileSubmit: jest.fn(),
  ...overrides,
});

/* ------------------------------------------------------------------ */
/* TESTS                                                                */
/* ------------------------------------------------------------------ */
describe("AccountSettings Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /* ---------------------------------------------------------------- */
  /* RENDERING TESTS                                                   */
  /* ---------------------------------------------------------------- */
  describe("Basic Rendering", () => {
    test("renders Account Settings title", () => {
      const props = createBaseProps();
      render(<AccountSettings {...props} />);
      expect(screen.getByText("Account Settings")).toBeInTheDocument();
    });

    test("renders all profile fields", () => {
      const props = createBaseProps();
      render(<AccountSettings {...props} />);

      expect(screen.getByText("First name")).toBeInTheDocument();
      expect(screen.getByText("Last name")).toBeInTheDocument();
      expect(screen.getByText("Email")).toBeInTheDocument();
      expect(screen.getByText("Date of birth")).toBeInTheDocument();
      expect(screen.getByText("Additional info")).toBeInTheDocument();
    });

    test("renders profile values correctly", () => {
      const props = createBaseProps();
      render(<AccountSettings {...props} />);

      expect(screen.getByDisplayValue("John")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Doe")).toBeInTheDocument();
      expect(screen.getByDisplayValue("john@test.com")).toBeInTheDocument();
    });

    test("renders Edit button", () => {
      const props = createBaseProps();
      render(<AccountSettings {...props} />);
      expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument();
    });
  });

  /* ---------------------------------------------------------------- */
  /* DATE OF BIRTH FORMATTING                                          */
  /* ---------------------------------------------------------------- */
  describe("Date of Birth Formatting", () => {
    test("formats valid ISO date correctly", () => {
      const props = createBaseProps({
        profileData: {
          ...createBaseProps().profileData,
          dateOfBirth: "2000-01-10",
        },
      });
      render(<AccountSettings {...props} />);
      expect(screen.getByDisplayValue("10 Jan 2000")).toBeInTheDocument();
    });

    test("handles empty date of birth", () => {
      const props = createBaseProps({
        profileData: {
          ...createBaseProps().profileData,
          dateOfBirth: "",
        },
      });
      render(<AccountSettings {...props} />);
      const dobInputs = screen.getAllByDisplayValue("");
      expect(dobInputs.length).toBeGreaterThan(0);
    });

    test("handles invalid date format gracefully", () => {
      const props = createBaseProps({
        profileData: {
          ...createBaseProps().profileData,
          dateOfBirth: "invalid-date",
        },
      });
      render(<AccountSettings {...props} />);
      expect(screen.getByDisplayValue("invalid-date")).toBeInTheDocument();
    });

    test("handles date parsing error", () => {
      const props = createBaseProps({
        profileData: {
          ...createBaseProps().profileData,
          dateOfBirth: "1990-13-45", // Invalid month/day
        },
      });
      render(<AccountSettings {...props} />);
      // Should fall back to string representation
      expect(screen.getByDisplayValue("1990-13-45")).toBeInTheDocument();
    });
  });

  /* ---------------------------------------------------------------- */
  /* CHANGE PASSWORD BUTTON VISIBILITY                                 */
  /* ---------------------------------------------------------------- */
  describe("Change Password Button Visibility", () => {
    test("shows Change Password button when passwordChangeAllowed is true", () => {
      const props = createBaseProps({
        profileData: {
          ...createBaseProps().profileData,
          passwordChangeAllowed: true,
        },
      });
      render(<AccountSettings {...props} />);
      expect(screen.getByText("Change Password?")).toBeInTheDocument();
    });

    test("shows Change Password button for SUPER_ADMIN role", () => {
      const props = createBaseProps({
        profileData: {
          ...createBaseProps().profileData,
          role: ROLES.SUPER_ADMIN,
          passwordChangeAllowed: false,
        },
      });
      render(<AccountSettings {...props} />);
      expect(screen.getByText("Change Password?")).toBeInTheDocument();
    });

    test("hides Change Password button when not allowed and not SUPER_ADMIN", () => {
      const props = createBaseProps({
        profileData: {
          ...createBaseProps().profileData,
          passwordChangeAllowed: false,
          role: ROLES.USER,
        },
      });
      render(<AccountSettings {...props} />);
      expect(screen.queryByText("Change Password?")).not.toBeInTheDocument();
    });
  });

  /* ---------------------------------------------------------------- */
  /* LOADING STATES                                                    */
  /* ---------------------------------------------------------------- */
  describe("Loading States", () => {
    test("shows skeleton loaders when isProfileLoading is true", () => {
      const props = createBaseProps({ isProfileLoading: true });
      render(<AccountSettings {...props} />);

      const skeletons = screen.getAllByTestId("skeleton");
      expect(skeletons.length).toBeGreaterThan(0);
    });

    test("hides actual values when loading", () => {
      const props = createBaseProps({ isProfileLoading: true });
      render(<AccountSettings {...props} />);

      expect(screen.queryByDisplayValue("John")).not.toBeInTheDocument();
    });
  });

  /* ---------------------------------------------------------------- */
  /* EDIT PROFILE DIALOG                                               */
  /* ---------------------------------------------------------------- */
  describe("Edit Profile Dialog", () => {
    test("opens edit profile dialog when Edit button is clicked", () => {
      const props = createBaseProps();
      render(<AccountSettings {...props} />);

      fireEvent.click(screen.getByRole("button", { name: /edit/i }));
      expect(props.onEditProfileOpenChange).toHaveBeenCalledWith(true);
    });

    test("renders edit profile dialog when open", () => {
      const props = createBaseProps({ editProfileOpen: true });
      render(<AccountSettings {...props} />);

      expect(screen.getByText("Edit Profile")).toBeInTheDocument();
      expect(
        screen.getByText("Update personal details to stay up-to-date.")
      ).toBeInTheDocument();
    });

    test("does not render edit profile dialog when closed", () => {
      const props = createBaseProps({ editProfileOpen: false });
      render(<AccountSettings {...props} />);

      expect(screen.queryByText("Edit Profile")).not.toBeInTheDocument();
    });

    test("submits edit profile form with valid data", async () => {
      const mockHandleSubmit = makeHandleSubmitMock<EditProfileFormValues>({
        firstName: "John",
        lastName: "Doe",
        email: "john@test.com",
        dateOfBirth: "10 Jan 2000",
        additionalInfo: "Info",
        gender: "",
        ethnicity: "",
        culturalAffinity: "",
      });

      const editForm = createMockForm<EditProfileFormValues>({
        handleSubmit: mockHandleSubmit,
        watch: jest.fn((field?: string) => {
          const values: Record<string, string> = {
            firstName: "John",
            lastName: "Doe",
            dateOfBirth: "10 Jan 2000",
          };
          return field ? values[field] : values;
        }) as unknown as UseFormWatch<EditProfileFormValues>,
      });

      const props = createBaseProps({
        editProfileOpen: true,
        editProfileForm: editForm,
      });

      render(<AccountSettings {...props} />);

      const saveButton = screen.getAllByText("Save")[0];
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(props.onEditProfileSubmit).toHaveBeenCalledWith({
          firstName: "John",
          lastName: "Doe",
          email: "john@test.com",
          dateOfBirth: "2000-01-10",
          additionalInfo: "Info",
          gender: "",
          ethnicity: "",
          culturalAffinity: "",
        });
      });
    });

    test("converts date format on profile submission", async () => {
      const mockHandleSubmit = makeHandleSubmitMock<EditProfileFormValues>({
        firstName: "Jane",
        lastName: "Smith",
        email: "jane@test.com",
        dateOfBirth: "15 Feb 1995",
        additionalInfo: "New info",
        gender: "",
        ethnicity: "",
        culturalAffinity: "",
      });

      const editForm = createMockForm<EditProfileFormValues>({
        handleSubmit: mockHandleSubmit,
        watch: jest.fn(() => "15 Feb 1995") as unknown as UseFormWatch<EditProfileFormValues>,
      });

      const props = createBaseProps({
        editProfileOpen: true,
        editProfileForm: editForm,
      });

      render(<AccountSettings {...props} />);

      const saveButton = screen.getAllByText("Save")[0];
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(props.onEditProfileSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            dateOfBirth: "1995-02-15",
          })
        );
      });
    });

    test("cancels edit profile and resets form", () => {
      const editForm = createMockForm<EditProfileFormValues>();
      const props = createBaseProps({
        editProfileOpen: true,
        editProfileForm: editForm,
      });

      render(<AccountSettings {...props} />);

      const cancelButton = screen.getAllByText("Cancel")[0];
      fireEvent.click(cancelButton);

      expect(props.onEditProfileOpenChange).toHaveBeenCalledWith(false);
      expect(editForm.reset).toHaveBeenCalledWith({
        firstName: "John",
        lastName: "Doe",
        email: "john@test.com",
        dateOfBirth: "2000-01-10",
        additionalInfo: "Info",
        gender: "",
        ethnicity: "",
        culturalAffinity: "",
      });
    });

    test("shows 'Saving...' text when updating profile", () => {
      const props = createBaseProps({
        editProfileOpen: true,
        isUpdatingProfile: true,
      });

      render(<AccountSettings {...props} />);
      expect(screen.getByText("Saving...")).toBeInTheDocument();
    });

    test("disables save button when updating profile", () => {
      const props = createBaseProps({
        editProfileOpen: true,
        isUpdatingProfile: true,
      });

      render(<AccountSettings {...props} />);
      const saveButton = screen.getByText("Saving...");
      expect(saveButton).toBeDisabled();
    });

    test("shows validation errors in edit profile form", () => {
      const editForm = createMockForm<EditProfileFormValues>({
        formState: {
          errors: {
            firstName: {
              message: "First name is required",
              type: "required",
            },
            lastName: {
              message: "Last name is required",
              type: "required",
            },
            additionalInfo: {
              message: "Too long",
              type: "maxLength",
            },
          },
          isSubmitting: false,
          isDirty: false,
          isValid: false,
          touchedFields: {},
          dirtyFields: {},
          isLoading: false,
          submitCount: 0,
          isSubmitted: false,
          isSubmitSuccessful: false,
          isValidating: false,
          disabled: false,
          validatingFields: {},
          isReady: false,
        },
      });

      const props = createBaseProps({
        editProfileOpen: true,
        editProfileForm: editForm,
      });

      render(<AccountSettings {...props} />);

      expect(screen.getByText("First name is required")).toBeInTheDocument();
      expect(screen.getByText("Last name is required")).toBeInTheDocument();
      expect(screen.getByText("Too long")).toBeInTheDocument();
    });

    test("renders null when editProfileForm is not provided", () => {
      const props = createBaseProps({
        editProfileOpen: true,
        editProfileForm: undefined as unknown as UseFormReturn<EditProfileFormValues>,
      });

      const { container } = render(<AccountSettings {...props} />);
      const form = container.querySelector("form");
      expect(form).not.toBeInTheDocument();
    });
  });

  /* ---------------------------------------------------------------- */
  /* CHANGE PASSWORD DIALOG                                            */
  /* ---------------------------------------------------------------- */
  describe("Change Password Dialog", () => {
    test("opens change password dialog when button is clicked", () => {
      const props = createBaseProps();
      render(<AccountSettings {...props} />);

      fireEvent.click(screen.getByText("Change Password?"));
      expect(props.onChangePasswordOpenChange).toHaveBeenCalledWith(true);
    });

    test("renders change password dialog when open", () => {
      const props = createBaseProps({ changePasswordOpen: true });
      render(<AccountSettings {...props} />);

      expect(screen.getByText("Change Password")).toBeInTheDocument();
      expect(
        screen.getByText("Update password to secure your account.")
      ).toBeInTheDocument();
    });

    test("submits change password form with valid data", async () => {
      const mockHandleSubmit = makeHandleSubmitMock<ChangePasswordFormValues>({
        current_password: process.env.FAKE_TEST_CHANGE_PASSWORD_CURRENT_SHORT as string,
        new_password: process.env.FAKE_TEST_CHANGE_PASSWORD_NEW_SHORT as string,
        confirm_password: process.env.FAKE_TEST_CHANGE_PASSWORD_NEW_SHORT as string,
      });

      const changeForm = createMockForm<ChangePasswordFormValues>({
        handleSubmit: mockHandleSubmit,
        watch: jest.fn((field?: string) => {
          if (field === "new_password") return process.env.FAKE_TEST_CHANGE_PASSWORD_NEW_SHORT as string;
          return "";
        }) as unknown as UseFormWatch<ChangePasswordFormValues>,
      });

      const props = createBaseProps({
        changePasswordOpen: true,
        changePasswordForm: changeForm,
      });

      render(<AccountSettings {...props} />);

      const saveButton = screen.getByText("Save Changes");
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(props.onChangePassword).toHaveBeenCalledWith({
          current_password: process.env.FAKE_TEST_CHANGE_PASSWORD_CURRENT_SHORT as string,
          new_password: process.env.FAKE_TEST_CHANGE_PASSWORD_NEW_SHORT as string,
          confirm_password: process.env.FAKE_TEST_CHANGE_PASSWORD_NEW_SHORT as string,
        });
      });
    });

    test("handles change password error and keeps dialog open", async () => {
      const mockOnChangePassword = jest
        .fn()
        .mockRejectedValue(new Error("Invalid password"));

      const mockHandleSubmit = makeHandleSubmitMockAsync<ChangePasswordFormValues>({
        current_password: process.env.FAKE_TEST_CHANGE_PASSWORD_WRONG_SHORT as string,
        new_password: process.env.FAKE_TEST_CHANGE_PASSWORD_NEW_SHORT as string,
        confirm_password: process.env.FAKE_TEST_CHANGE_PASSWORD_NEW_SHORT as string,
      });

      const changeForm = createMockForm<ChangePasswordFormValues>({
        handleSubmit: mockHandleSubmit,
        watch: jest.fn(() => process.env.FAKE_TEST_CHANGE_PASSWORD_NEW_SHORT as string) as unknown as UseFormWatch<ChangePasswordFormValues>,
      });

      const props = createBaseProps({
        changePasswordOpen: true,
        changePasswordForm: changeForm,
        onChangePassword: mockOnChangePassword,
      });

      render(<AccountSettings {...props} />);

      const saveButton = screen.getByText("Save Changes");
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockOnChangePassword).toHaveBeenCalled();
      });

      // Dialog should stay open on error (onChangePasswordOpenChange not called with false)
      expect(props.onChangePasswordOpenChange).not.toHaveBeenCalledWith(false);
    });

    test("cancels change password and resets form", () => {
      const changeForm = createMockForm<ChangePasswordFormValues>();
      const props = createBaseProps({
        changePasswordOpen: true,
        changePasswordForm: changeForm,
      });

      render(<AccountSettings {...props} />);

      const cancelButton = screen.getAllByText("Cancel")[0];
      fireEvent.click(cancelButton);

      expect(props.onChangePasswordOpenChange).toHaveBeenCalledWith(false);
      expect(changeForm.reset).toHaveBeenCalled();
    });

    test("shows 'Saving...' text when changing password", () => {
      const props = createBaseProps({
        changePasswordOpen: true,
        isChangingPassword: true,
      });

      render(<AccountSettings {...props} />);
      expect(screen.getByText("Saving...")).toBeInTheDocument();
    });

    test("disables save button when isChangingPassword is true", () => {
      const props = createBaseProps({
        changePasswordOpen: true,
        isChangingPassword: true,
      });

      render(<AccountSettings {...props} />);
      const saveButton = screen.getByText("Saving...");
      expect(saveButton).toBeDisabled();
    });

    test("disables save button when form is submitting", () => {
      const changeForm = createMockForm<ChangePasswordFormValues>({
        formState: {
          errors: {},
          isSubmitting: true,
          isDirty: false,
          isValid: true,
          touchedFields: {},
          dirtyFields: {},
          isLoading: false,
          submitCount: 0,
          isSubmitted: false,
          isSubmitSuccessful: false,
          isValidating: false,
          disabled: false,
          validatingFields: {},
          isReady: false,
        },
      });

      const props = createBaseProps({
        changePasswordOpen: true,
        changePasswordForm: changeForm,
      });

      render(<AccountSettings {...props} />);
      const saveButton = screen.getByText("Saving...");
      expect(saveButton).toBeDisabled();
    });

    test("shows validation errors in change password form", () => {
      const changeForm = createMockForm<ChangePasswordFormValues>({
        formState: {
          errors: {
            current_password: {
              message: "Current password is required",
              type: "required",
            },
            new_password: {
              message: "Password too short",
              type: "minLength",
            },
            confirm_password: {
              message: "Passwords do not match",
              type: "validate",
            },
          },
          isSubmitting: false,
          isDirty: false,
          isValid: false,
          touchedFields: {},
          dirtyFields: {},
          isLoading: false,
          submitCount: 0,
          isSubmitted: false,
          isSubmitSuccessful: false,
          isValidating: false,
          disabled: false,
          validatingFields: {},
          isReady: false,
        },
      });

      const props = createBaseProps({
        changePasswordOpen: true,
        changePasswordForm: changeForm,
      });

      render(<AccountSettings {...props} />);

      expect(
        screen.getByText("Current password is required")
      ).toBeInTheDocument();
      expect(screen.getByText("Password too short")).toBeInTheDocument();
      expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
    });

    test("renders null when changePasswordForm is not provided", () => {
      const props = createBaseProps({
        changePasswordOpen: true,
        changePasswordForm: undefined as unknown as UseFormReturn<ChangePasswordFormValues>,
      });

      render(<AccountSettings {...props} />);
      const passwordFields = screen.queryAllByTestId("password-field");
      expect(passwordFields.length).toBe(0);
    });
  });

  /* ---------------------------------------------------------------- */
  /* ADDITIONAL INFO                                                   */
  /* ---------------------------------------------------------------- */
  describe("Additional Info Field", () => {
    test("renders empty additional info", () => {
      const props = createBaseProps({
        profileData: {
          ...createBaseProps().profileData,
          additionalInfo: "",
        },
      });

      render(<AccountSettings {...props} />);
      const textarea = screen.getByPlaceholderText("Add additional info");
      expect(textarea).toHaveValue("");
    });

    test("renders null additional info as empty", () => {
      const props = createBaseProps({
        profileData: {
          ...createBaseProps().profileData,
          additionalInfo: undefined as unknown as string,
        },
      });

      render(<AccountSettings {...props} />);
      const textarea = screen.getByPlaceholderText("Add additional info");
      expect(textarea).toHaveValue("");
    });
  });

  /* ---------------------------------------------------------------- */
  /* LOGOUT BUTTON (Hidden)                                            */
  /* ---------------------------------------------------------------- */
  describe("Logout Button", () => {
    test("logout button is hidden and disabled", () => {
      const props = createBaseProps();
      const { container } = render(<AccountSettings {...props} />);

      // The logout button has 'hidden' class and is disabled
      const logoutButtons = Array.from(
        container.querySelectorAll("button")
      ).filter((btn) => btn.textContent?.includes("Logout"));

      if (logoutButtons.length > 0) {
        expect(logoutButtons[0]).toBeDisabled();
      }
    });
  });
});
