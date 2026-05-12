# Dashboard Primitives

Shared building blocks for every role's Dashboard. Compose these together — do not redefine them.

## Primitives

| Primitive          | File                  | Purpose                                                         |
| ------------------ | --------------------- | --------------------------------------------------------------- |
| `WelcomeBanner`    | `WelcomeBanner.tsx`   | Gradient hero with title/subtitle and inline action children.   |
| `StatCard`         | `StatCard.tsx`        | Single KPI tile (label, value, change, icon).                   |
| `DataCard`         | `DataCard.tsx`        | Bordered white container for charts, lists, tables, etc.        |
| `ProgressBar`      | `ProgressBar.tsx`     | Inline horizontal progress bar with label + percentage.         |
| `DashboardFrame`   | `DashboardFrame.tsx`  | Structural shell that arranges all of the above into a layout.  |

## `<DashboardFrame/>` — slot contract

```tsx
<DashboardFrame
  title="Welcome back, Jane"
  subtitle="Here's what's happening with your team today."
  bannerActions={<Button>Take a tour</Button>}        {/* optional — rendered inside the banner */}
  kpis={
    <DashboardFrame.KpiStrip>
      <StatCard {...usersKpi} />
      <StatCard {...sessionsKpi} />
      <StatCard {...satisfactionKpi} />
      <StatCard {...creditsKpi} />
    </DashboardFrame.KpiStrip>
  }
  primary={
    <>
      <DataCard title="Recent activity">…</DataCard>
      <DataCard title="Sessions this week">…</DataCard>
    </>
  }
  side={
    <>
      <DataCard title="Upcoming events">…</DataCard>
      <DataCard title="Quick actions">…</DataCard>
    </>
  }
/>
```

### Slot definitions

| Prop            | Type                | Required | Description                                                                                                               |
| --------------- | ------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------- |
| `title`         | `string`            | yes      | Hero title rendered by the embedded `WelcomeBanner`.                                                                      |
| `subtitle`      | `string`            | yes      | Hero subtitle rendered by the embedded `WelcomeBanner`.                                                                   |
| `bannerActions` | `React.ReactNode`   | no       | Inline children for the welcome banner (CTAs, badges, etc.).                                                              |
| `kpis`          | `React.ReactNode`   | no       | KPI strip area. Pass a `<DashboardFrame.KpiStrip/>` containing 4 `<StatCard/>` children for the standard arrangement.     |
| `primary`       | `React.ReactNode`   | yes      | Main content column (2/3 width on `lg+`, full width below). Consumer composes `<DataCard/>` children.                     |
| `side`          | `React.ReactNode`   | no       | Side rail (1/3 width on `lg+`, stacks below `primary` on smaller screens). When omitted, `primary` spans full width.      |
| `className`     | `string`            | no       | Forwarded to the outer `<div>` for one-off spacing tweaks.                                                                |

### Expected children types

- `kpis` is intended to receive a single `<DashboardFrame.KpiStrip/>` whose direct children are `<StatCard/>` instances. Other children render but won't get the responsive grid treatment.
- `primary` and `side` are intended to receive `<DataCard/>` instances (and optionally `<ProgressBar/>` or other inline content). Both slots already supply vertical spacing via `space-y-5`, so consumers don't need to add their own.
- `bannerActions` is intended for `<Button/>` / `<Link/>` style inline content.

### `<DashboardFrame.KpiStrip/>` — responsive behavior

| Breakpoint | Arrangement |
| ---------- | ----------- |
| `<sm`      | 1 column (stacked) |
| `sm–lg`    | 2x2 grid           |
| `lg+`      | 1x4 row            |

The strip wraps each child in a `role="listitem"` container so screen readers see the KPIs as a single list.

## Migration note — Wave 1 Lane 1.E

This primitive is the gating predecessor for **Wave 1 Lane 1.E** of the Dashboard Rationalization Plan v2 (`Transformation Documents/IG_Dashboard_Rationalization_Plan_2.docx`). In that lane, all six role dashboards adopt `<DashboardFrame/>`:

- `src/pages/user/Dashboard.tsx`
- `src/pages/manager/Dashboard.tsx`
- `src/pages/company-admin/Dashboard.tsx`
- `src/pages/practitioner/Dashboard.tsx`
- `src/pages/distributor/Dashboard.tsx`
- `src/pages/super-admin/Dashboard.tsx`

Wave 0 Lane 0.H (this PR) **only** adds the primitive. Role dashboards must not be modified until Wave 1.
