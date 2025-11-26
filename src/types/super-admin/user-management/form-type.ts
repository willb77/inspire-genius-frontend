export type UserRow = {
  id: string;
  name: string;
  email: string;
  first_name?: string;
  last_name?: string;
  status: "Active" | "Deactivated" | "Awaiting";
  invitation_id?: string | null;
  invitation_status: string;
};