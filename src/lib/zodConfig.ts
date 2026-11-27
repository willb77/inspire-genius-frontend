import { z } from "zod";

// CSP: the app must not need script-src 'unsafe-eval'. zod 4 compiles object
// parsers with `new Function(...)` (probed by allowsEval) unless told not to,
// which logs an "eval" violation under a CSP without 'unsafe-eval'. jitless
// makes zod use its interpreted path and skip the probe entirely.
//
// This MUST run before any schema is constructed: zod reads the setting when
// each object schema is built. Keep it the FIRST import in src/main.tsx (ES
// imports are hoisted and evaluated in order); a test guards that.
z.config({ jitless: true });
