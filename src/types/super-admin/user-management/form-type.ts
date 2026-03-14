export type UserRow = {
  id: string;
  name: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  status: "Active" | "Deactivated" | "Awaiting";
  invitation_id?: string | null;
  invitation_status: string;
  created_at?: string;
  is_email_verified?: boolean;
};