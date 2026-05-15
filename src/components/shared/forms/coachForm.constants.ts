export type CoachFormValues = {
  name: string;
  category: string;
  voice_style: string;
  voice_description: string;
  persona: string;
  status?: string;
};

export const COACH_FORM_DEFAULTS: CoachFormValues = {
  name: "",
  category: "",
  voice_style: "",
  voice_description: "",
  persona: "",
  status: "active",
};

export const COACH_FORM_RULES = {
  name: { required: "Coach name is required" },
  category: { required: "Category is required" },
  voice_style: {},
  voice_description: {},
  persona: {},
  status: {},
} as const;
