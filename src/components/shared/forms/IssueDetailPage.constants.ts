export type IssueDetailFormValues = {
  comment: string;
  status: string;
};

export const ISSUE_STATUSES = [
  "open",
  "in-progress",
  "resolved",
  "closed",
] as const;

export const ISSUE_DETAIL_DEFAULTS: IssueDetailFormValues = {
  comment: "",
  status: "",
};

export const ISSUE_DETAIL_RULES = {
  comment: {
    required: "Comment is required",
    minLength: {
      value: 5,
      message: "Comment must be at least 5 characters long",
    },
    maxLength: {
      value: 300,
      message: "Comment cannot exceed 300 characters",
    },
    pattern: {
      value: /^[A-Za-z0-9\s.,!?'"-]+$/,
      message: "Comment contains invalid characters",
    },
  },
  status: {
    // Not required, but you can enable this if needed:
    // required: "Status is required",
    validate: (value: string) => {
      if (value && !ISSUE_STATUSES.includes(value as any)) {
        return "Invalid status selected";
      }
      return true;
    },
  },
} as const;

export const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case "open":
      return "bg-yellow-100 text-yellow-700 border-transparent";
    case "in-progress":
      return "bg-blue-100 text-blue-700 border-transparent";
    case "resolved":
    case "closed":
      return "bg-green-100 text-green-700 border-transparent";
    default:
      return "bg-gray-100 text-gray-700 border-transparent";
  }
};

export const getPriorityColor = (priority: string) => {
  switch (priority.toLowerCase()) {
    case "critical":
      return "bg-red-100 text-red-700 border-transparent";
    case "high":
      return "bg-orange-100 text-orange-700 border-transparent";
    case "medium":
      return "bg-yellow-100 text-yellow-700 border-transparent";
    case "low":
      return "bg-green-100 text-green-700 border-transparent";
    default:
      return "bg-gray-100 text-gray-700 border-transparent";
  }
};
