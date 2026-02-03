export type TeamFormValues = {
  name: string;
  email: string;
  role: string;
  status: "Active" | "Deactivated";
};

export const TEAM_ROLES = [
  "Admin",
  "Manager",
  "Employee",
  "Human Resource",
  "Lead",
] as const;

export const TEAM_FORM_DEFAULTS: TeamFormValues = {
  name: "",
  email: "",
  role: "",
  status: "Active",
};

export const TEAM_FORM_RULES = {
  name: { required: "Name is required" },
  email: {
    required: "Email is required",
    // Bounded, simple email pattern to avoid catastrophic backtracking
    // local-part up to 64, domain up to 253, simple TLD 2+
    validate: (value: string) => {
      if (!value) return true;

      const msg = "Enter a valid email";
      const atIndex = value.indexOf("@");
      if (atIndex <= 0) return msg;
      if (value.indexOf("@", atIndex + 1) !== -1) return msg;

      const local = value.slice(0, atIndex);
      const domain = value.slice(atIndex + 1);
      if (local.length < 1 || local.length > 64) return msg;
      if (!domain) return msg;

      for (let i = 0; i < local.length; i += 1) {
        const ch = local[i] ?? "";
        const code = ch.charCodeAt(0);
        const isUpper = code >= 65 && code <= 90;
        const isLower = code >= 97 && code <= 122;
        const isDigit = code >= 48 && code <= 57;
        const isAllowedSymbol = ch === "." || ch === "_" || ch === "%" || ch === "+" || ch === "-";
        if (!(isUpper || isLower || isDigit || isAllowedSymbol)) return msg;
      }

      const lastDot = domain.lastIndexOf(".");
      if (lastDot <= 0 || lastDot >= domain.length - 1) return msg;

      const host = domain.slice(0, lastDot);
      const tld = domain.slice(lastDot + 1);
      if (tld.length < 2) return msg;

      if (host.length < 1 || host.length > 253) return msg;

      for (let i = 0; i < host.length; i += 1) {
        const ch = host[i] ?? "";
        const code = ch.charCodeAt(0);
        const isUpper = code >= 65 && code <= 90;
        const isLower = code >= 97 && code <= 122;
        const isDigit = code >= 48 && code <= 57;
        const isAllowedSymbol = ch === "." || ch === "-";
        if (!(isUpper || isLower || isDigit || isAllowedSymbol)) return msg;
      }

      for (let i = 0; i < tld.length; i += 1) {
        const ch = tld[i] ?? "";
        const code = ch.charCodeAt(0);
        const isUpper = code >= 65 && code <= 90;
        const isLower = code >= 97 && code <= 122;
        if (!(isUpper || isLower)) return msg;
      }

      return true;
    },
  },
  role: { required: "Role is required" },
  status: {},
} as const;
