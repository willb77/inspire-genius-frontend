// Auth-related type definitions
// This file serves as the main export point for all auth types

// Context types
export type { AuthUser, AuthContextValue, PendingRoleSelection } from './context-types';

// Component types
export type { 
  FirstNameFieldProps,
  LastNameFieldProps,
  EmailFieldProps, 
  PasswordFieldProps, 
  AuthHeaderProps, 
  AuthLayoutProps 
} from './component-types';

// Storage types
export type { StoredUser } from './storage-types';
