export interface CoachInfo {
  id: string;
  agentId: string;
  toneIds: string[];
  accentId: string;
  genderId: string;
}
// Combined form data for all steps
export interface OrganizationFormData {
  // Step 1: Organization Info
  organization_name: string;
  type: string;
  email: string;
  contact: string;
  website_url: string;
  address: string;
  logo?: File | null;
  
  // Step 2: Coaches Info
  coaches: CoachInfo[];
  
  // Step 3: License Info
  license_type: string;
  license_key: string;
  license_start_date?: string;
  license_end_date?: string;
  
  // Internal tracking
  organization_id?: string;
}

export type OrganizationRow = {
  id: string;
  name: string;
  type: string;
  status: "Active" | "Deactivated";
  admin_is_active: boolean;
};