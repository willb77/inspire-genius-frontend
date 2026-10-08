import { SUPER_ADMIN_NAV_ITEMS } from "@/constants/navigation";
import { ROUTES } from "@/constants/routes";

// Org dropdown option 2: the Organizations page existed with no sidebar entry
// (reachable only from a Dashboard card). It is now one click from the nav.
describe("super-admin Organizations nav link", () => {
  it("is in the super-admin sidebar, pointing at the Organizations page", () => {
    const item = SUPER_ADMIN_NAV_ITEMS.find((i) => i.label === "Organizations");
    expect(item?.to).toBe(ROUTES.SUPER_ADMIN.ORGANIZATIONS);
  });

  it("keeps sidebar labels unique (SidebarScaffold keys by label)", () => {
    const labels = SUPER_ADMIN_NAV_ITEMS.map((i) => i.label);
    expect(new Set(labels).size).toBe(labels.length);
  });
});
