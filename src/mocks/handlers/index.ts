import { authHandlers } from "./auth"
import { managerHandlers } from "./manager"
import { companyAdminHandlers } from "./company-admin"
import { practitionerHandlers } from "./practitioner"
import { distributorHandlers } from "./distributor"
import { analyticsHandlers } from "./analytics"

export const handlers = [
  ...authHandlers,
  ...managerHandlers,
  ...companyAdminHandlers,
  ...practitionerHandlers,
  ...distributorHandlers,
  ...analyticsHandlers,
]
