import { apiErrorMessage } from "@/lib/apiErrorMessage"

/**
 * The bug: FastAPI's `detail` is a STRING for a raised HTTPException and an
 * ARRAY OF OBJECTS for a 422. Four call sites passed it straight to
 * `toast.error(...)`, so a 422 handed an array of objects to sonner, React
 * refused to render an object as a child (#31), and the ErrorBoundary took the
 * page down. A failed save crashed the app.
 */

/** The exact payload the Save button produced against staging-b. */
const REAL_422 = {
  response: {
    data: {
      detail: [
        {
          type: "string_type",
          loc: ["body", "evidence", "sd_score"],
          msg: "Input should be a valid string",
          input: 4,
        },
        {
          type: "string_type",
          loc: ["body", "evidence", "skew"],
          msg: "Input should be a valid string",
          input: 22,
        },
      ],
    },
  },
}

it("turns the real 422 into something an operator can act on", () => {
  const msg = apiErrorMessage(REAL_422, "Could not save")
  expect(typeof msg).toBe("string")
  expect(msg).toContain("evidence.sd_score")
  expect(msg).toContain("Input should be a valid string")
})

it("drops the leading scope from the field path", () => {
  // "body" is an implementation detail of FastAPI, not information.
  expect(apiErrorMessage(REAL_422, "x")).not.toContain("body")
})

it("passes a plain string detail through unchanged", () => {
  const err = { response: { data: { detail: "You already have a profile named 'Sonny'." } } }
  expect(apiErrorMessage(err, "fallback")).toBe("You already have a profile named 'Sonny'.")
})

it("bounds a long validation list instead of filling the toast", () => {
  const many = {
    response: {
      data: {
        detail: Array.from({ length: 9 }, (_, i) => ({
          msg: "bad",
          loc: ["body", `field${i}`],
          type: "x",
        })),
      },
    },
  }
  const msg = apiErrorMessage(many, "fallback")
  expect(msg).toContain("and 6 more")
  expect(msg.length).toBeLessThan(200)
})

it("falls back rather than rendering an object it does not understand", () => {
  const weird = { response: { data: { detail: { unexpected: { nested: true } } } } }
  expect(apiErrorMessage(weird, "Could not save")).toBe("Could not save")
})

it("uses an Error's message when there is no response body", () => {
  expect(apiErrorMessage(new Error("Network Error"), "fallback")).toBe("Network Error")
})

it("ALWAYS returns a string, whatever it is handed", () => {
  // This is the property that keeps a failed request from taking the page down.
  // Anything that is not a string here is a crash in front of the user.
  const shapes: unknown[] = [
    undefined,
    null,
    0,
    "",
    [],
    {},
    { response: {} },
    { response: { data: {} } },
    { response: { data: { detail: null } } },
    { response: { data: { detail: [] } } },
    { response: { data: { detail: [{ nope: 1 }] } } },
    { response: { data: { detail: 42 } } },
    { response: { data: { detail: { msg: "lonely", loc: ["body", "x"] } } } },
    REAL_422,
    new Error(""),
    new TypeError("boom"),
  ]
  for (const shape of shapes) {
    const out = apiErrorMessage(shape, "fallback")
    expect(typeof out).toBe("string")
    expect(out.length).toBeGreaterThan(0)
  }
})
