import { getIssueDetailRules, ISSUE_STATUS_VALUES } from "./formRules";

export type IssueDetailFormValues = {
  comment: string;
  status: string;
};

export const ISSUE_STATUSES = ISSUE_STATUS_VALUES;

export const ISSUE_DETAIL_DEFAULTS: IssueDetailFormValues = {
  comment: "",
  status: "",
};

/** English-identity. Components use getIssueDetailRules(t). */
export const ISSUE_DETAIL_RULES = getIssueDetailRules();

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
