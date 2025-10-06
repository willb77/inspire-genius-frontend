// Auth component related types

export type EmailFieldProps = {
  id?: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
};

export type PasswordFieldProps = {
  id?: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
};

export interface AuthHeaderProps {
  title: string;
  subtitle?: string;
}

export interface AuthLayoutProps {
  leftTitleOne?: string;
  leftTitleTwo?: string;
  subTitle?: string;
  children: React.ReactNode;
}
