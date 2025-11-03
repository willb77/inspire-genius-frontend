export type UserRow = {
  id: string;
  name: string;
  email: string;
  first_name?: string;
  last_name?: string;
  status: "Active" | "Awaiting" | "Deactivated";
  invitation_id?: string | null;
};