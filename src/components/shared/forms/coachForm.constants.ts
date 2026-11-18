import { getCoachFormRules } from "./formRules";

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

/** English-identity. Components use getCoachFormRules(t). */
export const COACH_FORM_RULES = getCoachFormRules();
