/* eslint-disable @typescript-eslint/no-require-imports -- jest.isolateModules needs synchronous require() to load a fresh zod per case; a static import would share one module instance and defeat the import-order check. */
/**
 * zod 4 probes `new Function("")` when an object schema is constructed, which
 * is a script-src 'unsafe-eval' violation under a strict CSP. lib/zodConfig
 * sets jitless before any schema exists so the probe never runs.
 */
type Counter = { calls: number; restore: () => void }

function spyOnFunctionConstructor(): Counter {
  const original = globalThis.Function
  const counter: Counter = {
    calls: 0,
    restore: () => {
      globalThis.Function = original
    },
  }
  globalThis.Function = new Proxy(original, {
    construct(target, args) {
      // Istanbul's coverage preamble does new Function("return this") in every
      // instrumented module; that is not zod, so it is not counted.
      if (String(args[args.length - 1]) !== "return this") counter.calls += 1
      return Reflect.construct(target, args)
    },
  })
  return counter
}

function buildAndParse(z: typeof import("zod").z) {
  const schema = z.object({ name: z.string(), age: z.number() })
  return schema.parse({ name: "a", age: 1 })
}

// zod keeps its config on globalThis, which jest.isolateModules does not reset.
function resetZodGlobalConfig() {
  delete (globalThis as { __zod_globalConfig?: unknown }).__zod_globalConfig
}

describe("zodConfig (no eval from zod)", () => {
  beforeEach(resetZodGlobalConfig)
  afterEach(resetZodGlobalConfig)

  it("never calls Function when zodConfig is imported first", () => {
    const spy = spyOnFunctionConstructor()
    try {
      jest.isolateModules(() => {
        require("../zodConfig")
        const { z } = require("zod")
        expect(buildAndParse(z)).toEqual({ name: "a", age: 1 })
      })
      expect(spy.calls).toBe(0)
    } finally {
      spy.restore()
    }
  })

  it("control: without zodConfig zod DOES call Function", () => {
    const spy = spyOnFunctionConstructor()
    try {
      jest.isolateModules(() => {
        const { z } = require("zod")
        buildAndParse(z)
      })
      expect(spy.calls).toBeGreaterThan(0)
    } finally {
      spy.restore()
    }
  })

  it("control: a schema built before the config still calls Function (order matters)", () => {
    const spy = spyOnFunctionConstructor()
    try {
      jest.isolateModules(() => {
        const { z } = require("zod")
        z.object({ early: z.string() })
        require("../zodConfig")
      })
      expect(spy.calls).toBeGreaterThan(0)
    } finally {
      spy.restore()
    }
  })
})
