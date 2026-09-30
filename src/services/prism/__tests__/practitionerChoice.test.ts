import { practitionerChoiceFrom } from "@/services/prism/prism";

jest.mock("@/lib/agentApi", () => ({ agentApi: { get: jest.fn(), post: jest.fn() } }));

const err = (status: number, detail: unknown) => ({ response: { status, data: { detail } } });
const list = [{ practitionerSub: "p-a", displayName: "Avery" }];

describe("practitionerChoiceFrom (PC-1b)", () => {
  it("reads the caller's own practitioners off a choice-required 409", () => {
    expect(
      practitionerChoiceFrom(err(409, { code: "practitioner_choice_required", practitioners: list }))
    ).toEqual(list);
  });

  it.each([
    ["another status", err(403, { code: "practitioner_choice_required", practitioners: list })],
    ["another 409 code", err(409, { code: "conflict", practitioners: list })],
    ["a string detail", err(409, "nope")],
    ["no practitioners", err(409, { code: "practitioner_choice_required", practitioners: [] })],
    ["malformed entries", err(409, { code: "practitioner_choice_required", practitioners: [{ id: 1 }] })],
    ["a network error", new Error("offline")],
  ])("is null for %s", (_label, e) => {
    expect(practitionerChoiceFrom(e)).toBeNull();
  });
});
