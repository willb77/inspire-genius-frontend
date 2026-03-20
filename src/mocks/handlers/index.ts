import { authHandlers } from "./auth"
import { managerHandlers } from "./manager"
import { companyAdminHandlers } from "./company-admin"
import { practitionerHandlers } from "./practitioner"
import { distributorHandlers } from "./distributor"

export const handlers = [
  ...authHandlers,
  ...managerHandlers,
  ...companyAdminHandlers,
  ...practitionerHandlers,
  ...distributorHandlers,
]
