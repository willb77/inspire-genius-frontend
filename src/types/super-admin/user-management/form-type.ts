export type UserRow = {
  id: string;
  name: string;
  email: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  status: "Active" | "Awaiting" | "Deactivated";
  invitation_status: string;
  invitation_id?: string | null;
};