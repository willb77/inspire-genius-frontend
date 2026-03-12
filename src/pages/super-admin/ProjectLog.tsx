import { useState } from "react";
import SuperAdminLayout from "@/layouts/SuperAdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/* ── Static content from project documentation files ─────────────── */

const CHANGE_LOG = `## [2026-03-11] — Project Documentation & Admin Project Log Page

### Added
- \`change_log.md\` — tracks all project changes
- \`database_schema.md\` — documents frontend data models and API entity schemas
- \`CLAUDE.md\` — Claude Code guidance file for AI-assisted development
- \`.claude/rules/\` — rule files for code style, architecture, and workflow
  - \`code-style.md\` — TypeScript/React/Tailwind conventions
  - \`architecture.md\` — data flow and structural rules
  - \`workflow.md\` — development workflow and deployment rules
- \`src/pages/super-admin/ProjectLog.tsx\` — new super admin page rendering project documentation
- \`IG_project_log.html\` — standalone HTML export of all project documentation
- Added "Project Log" entry to super admin sidebar navigation
- Added \`/super-admin/project-log\` route`;

const DATABASE_SCHEMA = `## Core Entities

### User (AuthUser)
| Field | Type | Notes |
|---|---|---|
| id | string (UUID) | Primary key |
| email | string | Unique |
| name | string? | Display name |
| fullName | string? | Full name |
| role | string | "user" or "super-admin" |
| isOnboardingCompleted | boolean | Onboarding status |

### UserRow (Admin User Management)
| Field | Type | Notes |
|---|---|---|
| id | string | Primary key |
| name | string | Display name |
| email | string | Email |
| first_name | string? | First name |
| last_name | string? | Last name |
| status | enum | "Active", "Deactivated", "Awaiting" |
| invitation_id | string? | FK → Invitation |
| invitation_status | string | Invitation state |

### Organization
| Field | Type | Notes |
|---|---|---|
| organization_id | string? | Primary key |
| organization_name | string | Name |
| type | string | Organization type |
| email | string | Contact email |
| contact | string | Contact number |
| website_url | string | Website |
| address | string | Address |
| coaches | CoachInfo[] | Assigned coaches |
| license_type | string | License type |
| license_key | string | License key |
| license_start_date | string? | License start |
| license_end_date | string? | License expiry |

### OrganizationRow (Admin List)
| Field | Type | Notes |
|---|---|---|
| id | string | Primary key |
| name | string | Name |
| type | string | Type |
| status | enum | "Active", "Deactivated" |
| admin_is_active | boolean | Admin account active |

### CoachInfo
| Field | Type | Notes |
|---|---|---|
| id | string | Primary key |
| agentId | string | FK → Agent |
| toneIds | string[] | FK → Tone[] |
| accentId | string | FK → Accent |
| genderId | string | FK → Gender |

### DocItem (Documents)
| Field | Type | Notes |
|---|---|---|
| id | string | Primary key |
| name | string | File name |
| kind | enum | "pdf", "csv", "ppt", "doc" |
| createdAt | Date | Upload date |
| url | string | Download URL |

### ChatMessage
| Field | Type | Notes |
|---|---|---|
| id | string | Message ID |
| kind | enum | "text", "doc", "processing" |
| sender | enum | "assistant", "user" |
| text | string? | Message text |
| time | string | Timestamp |

### HelpFormValues (Issue Submission)
| Field | Type | Notes |
|---|---|---|
| issueTypeId | string | FK → IssueType |
| subject | string | Issue subject |
| description | string | Description |
| priority | enum | "low", "medium", "high", "critical" |
| attachments | File[] | Attached files |

## API Envelope
All responses wrapped in: BaseApiResponse<T> { status, success, message, error_status, data }

## Environment Variables
| Variable | Purpose |
|---|---|
| VITE_API_BASE_URL | Backend API base URL |
| VITE_ALEX_WEBSOCKET_URL | Alex voice assistant WebSocket |
| VITE_AGENTS_WEBSOCKET_BASE_URL | Agent WebSocket base |
| VITE_STORAGE_SECRET | Encryption key for secure storage |`;

const CLAUDE_MD = `## Project Overview
Inspire Genius is an AI coaching platform frontend. The app code lives entirely in inspire-genius-frontend/.

## Stack
React 19 + TypeScript + Vite 7 + Tailwind CSS 4 + shadcn/ui (new-york style, slate base)

## Data Flow Pattern
Service → Hook → Component
- Services (src/services/): Axios calls organized by domain
- Hooks (src/hooks/): React Query mutations/queries wrapping services
- Pages (src/pages/): Route-level components organized by role

## Global State
React Context only — AuthContext, TourContext, SidebarContext

## Routing
- Public: /login, /signup, /otp, /forgot, /reset-password, /accept-invitation, /social-login
- User: /home, /dashboard, /coaches, /documents, /settings, /help, /onboarding/*
- Super Admin: /super-admin/*
- ProtectedRoute enforces auth, role checks, and onboarding completion

## Two Roles
"user" and "super-admin" (ROLES constant)

## API Layer
Singleton axios instance with token injection and 401 auto-refresh interceptors

## Testing
Jest + jsdom + React Testing Library, tests colocated in __tests__/ directories`;

const RULES = {
  "code-style": `## TypeScript
- Strict TypeScript; avoid \`any\` — use proper types from src/types/
- Use \`type\` for object shapes, \`interface\` only when extending
- Prefer named exports for components, default exports for pages

## React
- Functional components only
- React Hook Form + Zod for forms
- TanStack React Query for server state
- Context for global state only (auth, tour, sidebar)

## Styling
- Tailwind CSS utilities only — no CSS modules
- cn() from @/lib/utils for conditional classes
- shadcn/ui from @/components/ui/
- lucide-react icons exclusively

## File Organization
- Pages: src/pages/{auth,onboarding,user,super-admin,legal}/
- Tests: __tests__/ next to source
- Services: src/services/ by domain
- Hooks: src/hooks/ by domain
- Types: src/types/ by domain
- Path alias @/ → src/`,

  architecture: `## Data Flow
Service → Hook → Component (never call services from components directly)

## API Layer
- All HTTP via singleton axios in src/lib/axios.ts
- Token injection & 401 refresh handled by interceptors
- Responses follow BaseApiResponse<T> envelope

## Auth
- AuthContext manages auth lifecycle
- useAuth() hook for auth state
- ProtectedRoute enforces roles
- Two roles: "user" and "super-admin"
- Encrypted storage for tokens

## Routing
- All routes in src/routes.tsx using useRoutes
- Constants in src/constants/routes.ts
- Super admin pages → SuperAdminLayout
- User pages → UserLayout
- Both use SidebarScaffold underneath`,

  workflow: `## Commands (from inspire-genius-frontend/)
- Dev: npm run dev
- Build: npm run build
- Lint: npm run lint
- Test: npm run test (watch) / npm run test:ci

## Deployment
- GitLab CI on "development" branch
- Pipeline: build → SonarQube → S3 + CloudFront

## Adding a Super Admin Page
1. Create in src/pages/super-admin/
2. Wrap with SuperAdminLayout
3. Add ROUTES.SUPER_ADMIN constant
4. Add route in src/routes.tsx
5. Add nav item in src/layouts/SuperAdminLayout.tsx

## Documentation
- Update change_log.md for notable changes
- Update database_schema.md for data model changes
- Update CLAUDE.md for architecture changes
- Keep .claude/rules/ current`,
};

/* ── Simple Markdown-to-JSX renderer (tables, headings, lists, code) ── */

function MarkdownBlock({ text }: { text: string }) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Table detection
    if (line.includes("|") && i + 1 < lines.length && lines[i + 1]?.match(/^\|[\s-|]+\|$/)) {
      const headerCells = line.split("|").filter(Boolean).map((c) => c.trim());
      i += 2; // skip header + separator
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes("|")) {
        rows.push(lines[i].split("|").filter(Boolean).map((c) => c.trim()));
        i++;
      }
      elements.push(
        <div key={`tbl-${i}`} className="overflow-x-auto my-4">
          <table className="min-w-full text-sm border border-border">
            <thead>
              <tr className="bg-muted">
                {headerCells.map((h, ci) => (
                  <th key={ci} className="px-3 py-2 text-left font-semibold border-b border-border">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} className={ri % 2 === 0 ? "" : "bg-muted/40"}>
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-2 border-b border-border">
                      <code className="text-xs">{cell}</code>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Headings
    if (line.startsWith("### ")) {
      elements.push(<h4 key={i} className="text-base font-semibold mt-6 mb-2">{line.slice(4)}</h4>);
    } else if (line.startsWith("## ")) {
      elements.push(<h3 key={i} className="text-lg font-bold mt-8 mb-3 text-blue-primary">{line.slice(3)}</h3>);
    } else if (line.startsWith("# ")) {
      elements.push(<h2 key={i} className="text-xl font-bold mt-6 mb-4">{line.slice(2)}</h2>);
    }
    // List items
    else if (line.match(/^[-*] /)) {
      elements.push(
        <li key={i} className="ml-4 list-disc text-sm text-muted-foreground">
          <InlineCode text={line.slice(2)} />
        </li>
      );
    }
    // Code block backticks — skip
    else if (line.startsWith("```")) {
      // skip
    }
    // Non-empty paragraph
    else if (line.trim()) {
      elements.push(
        <p key={i} className="text-sm text-muted-foreground my-1">
          <InlineCode text={line} />
        </p>
      );
    }

    i++;
  }

  return <div>{elements}</div>;
}

function InlineCode({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("`") && part.endsWith("`") ? (
          <code key={i} className="bg-muted px-1 py-0.5 rounded text-xs font-mono">
            {part.slice(1, -1)}
          </code>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

/* ── Page Component ───────────────────────────────────────────────── */

const tabs = [
  { id: "changelog", label: "Change Log", content: CHANGE_LOG },
  { id: "schema", label: "Database Schema", content: DATABASE_SCHEMA },
  { id: "claude", label: "CLAUDE.md", content: CLAUDE_MD },
  { id: "rules-style", label: "Code Style Rules", content: RULES["code-style"] },
  { id: "rules-arch", label: "Architecture Rules", content: RULES.architecture },
  { id: "rules-workflow", label: "Workflow Rules", content: RULES.workflow },
];

export default function ProjectLog() {
  const [activeTab, setActiveTab] = useState("changelog");

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Project Log</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Documentation, change log, database schema, and development rules
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex flex-wrap h-auto gap-1">
            {tabs.map((t) => (
              <TabsTrigger key={t.id} value={t.id} className="text-xs">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {tabs.map((t) => (
            <TabsContent key={t.id} value={t.id}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <MarkdownBlock text={t.content} />
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </SuperAdminLayout>
  );
}
