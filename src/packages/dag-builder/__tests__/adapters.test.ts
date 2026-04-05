/**
 * Unit tests for ecosystem adapters — serialization round-trip.
 */

import { igAdapter } from "../adapters/ig-adapter";
import { voiceDeskAdapter } from "../adapters/voicedeskai-adapter";
import { createGenericAdapter } from "../adapters/generic-adapter";
import type { DagTemplate, DagNode } from "../types/dag";

function makeTemplate(nodes: DagNode[]): DagTemplate {
  return {
    id: "test-1",
    name: "Test Template",
    description: "A test template",
    version: 1,
    triggerKeywords: ["test", "example"],
    nodes,
    edges: [],
    metadata: {},
  };
}

// ─── IG Adapter ─────────────────────────────────────────────────

describe("igAdapter", () => {
  test("toApiFormat produces correct shape", () => {
    const tpl = makeTemplate([
      {
        id: "s0",
        agentId: "Meridian",
        label: "Meridian",
        description: "Open session",
        dependsOn: [],
        config: { timeout: 30 },
        position: { x: 0, y: 0 },
      },
      {
        id: "s1",
        agentId: "Aura",
        label: "Aura",
        description: "PRISM analysis",
        dependsOn: ["s0"],
        config: { timeout: 30 },
        position: { x: 0, y: 0 },
      },
    ]);

    const api = igAdapter.toApiFormat(tpl) as any;
    expect(api.name).toBe("Test Template");
    expect(api.steps.length).toBe(2);
    expect(api.steps[0].agent_name).toBe("Meridian");
    expect(api.steps[0].depends_on).toEqual([]);
    expect(api.steps[1].agent_name).toBe("Aura");
    expect(api.steps[1].depends_on).toEqual(["0"]);
  });

  test("fromApiFormat round-trip", () => {
    const apiData = {
      id: "uuid-1",
      name: "Coaching Session",
      description: "Run a coaching session",
      trigger_keywords: ["coaching", "session"],
      steps: [
        {
          agent_name: "Meridian",
          task_description: "Open the session",
          depends_on: [],
          timeout_seconds: 30,
        },
        {
          agent_name: "Aura",
          task_description: "PRISM context",
          depends_on: ["0"],
          timeout_seconds: 30,
        },
      ],
      is_active: true,
      org_id: null,
    };

    const tpl = igAdapter.fromApiFormat(apiData);
    expect(tpl.name).toBe("Coaching Session");
    expect(tpl.nodes.length).toBe(2);
    expect(tpl.nodes[0].agentId).toBe("Meridian");
    expect(tpl.nodes[1].dependsOn).toEqual(["step_0"]);

    // Round-trip: fromApi → toApi should produce similar structure
    const reApi = igAdapter.toApiFormat(tpl) as any;
    expect(reApi.steps[0].agent_name).toBe("Meridian");
    expect(reApi.steps[1].depends_on).toEqual(["0"]);
  });

  test("empty steps handled", () => {
    const tpl = makeTemplate([]);
    const api = igAdapter.toApiFormat(tpl) as any;
    expect(api.steps).toEqual([]);
  });

  test("parallel steps (no cross-deps) map correctly", () => {
    const tpl = makeTemplate([
      {
        id: "s0",
        agentId: "Atlas",
        label: "Atlas",
        description: "Pull analytics",
        dependsOn: [],
        config: { timeout: 30 },
        position: { x: 0, y: 0 },
      },
      {
        id: "s1",
        agentId: "Aura",
        label: "Aura",
        description: "PRISM analysis",
        dependsOn: ["s0"],
        config: { timeout: 30 },
        position: { x: 0, y: 0 },
      },
      {
        id: "s2",
        agentId: "James",
        label: "James",
        description: "Admin check",
        dependsOn: ["s0"],
        config: { timeout: 30 },
        position: { x: 0, y: 0 },
      },
      {
        id: "s3",
        agentId: "Sentinel",
        label: "Sentinel",
        description: "Compliance",
        dependsOn: ["s1", "s2"],
        config: { timeout: 30 },
        position: { x: 0, y: 0 },
      },
    ]);

    const api = igAdapter.toApiFormat(tpl) as any;
    expect(api.steps[3].depends_on.sort()).toEqual(["1", "2"]);
  });
});

// ─── VoiceDeskAI Adapter ────────────────────────────────────────

describe("voiceDeskAdapter", () => {
  test("round-trip produces valid template", () => {
    const tpl = makeTemplate([
      {
        id: "n0",
        agentId: "Router",
        label: "Router",
        description: "Route the call",
        dependsOn: [],
        config: { timeout: 10 },
        position: { x: 0, y: 0 },
      },
    ]);

    const api = voiceDeskAdapter.toApiFormat(tpl) as any;
    expect(api.workflow_name).toBe("Test Template");
    expect(api.steps[0].agent_type).toBe("Router");
    expect(api.steps[0].timeout_ms).toBe(10000);

    const back = voiceDeskAdapter.fromApiFormat(api);
    expect(back.nodes[0].agentId).toBe("Router");
  });
});

// ─── Generic Adapter Factory ────────────────────────────────────

describe("createGenericAdapter", () => {
  test("creates a working adapter from config", () => {
    const adapter = createGenericAdapter({
      ecosystemName: "test-eco",
      agents: [
        {
          id: "AgentA",
          name: "AgentA",
          displayName: "Agent A",
          description: "Test",
          domain: "Test",
        },
      ],
      domainGroups: { Test: ["AgentA"] },
      apiFormat: {
        templateKey: "workflow",
        stepKey: "tasks",
        agentField: "worker",
        descriptionField: "instruction",
        dependsOnField: "prereqs",
        timeoutField: "timeout_s",
        timeoutUnit: "seconds",
      },
    });

    expect(adapter.name).toBe("test-eco");
    expect(adapter.agents.length).toBe(1);

    const tpl = makeTemplate([
      {
        id: "n0",
        agentId: "AgentA",
        label: "Agent A",
        description: "Do something",
        dependsOn: [],
        config: { timeout: 30 },
        position: { x: 0, y: 0 },
      },
    ]);

    const api = adapter.toApiFormat(tpl) as any;
    expect(api.tasks[0].worker).toBe("AgentA");
    expect(api.tasks[0].instruction).toBe("Do something");
  });
});
