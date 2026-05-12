# ChartKit Primitives

Shared chart primitives used by every Analytics page (Manager, Company, Super‑Admin,
Practitioner, Distributor). One implementation, one style, one prop contract — so
that all five role dashboards stay visually and behaviourally consistent.

> **Wave 0 / Lane 0.G** of the IG Dashboard Rationalization Plan v2 (P3.1).
> This lane only **adds** the kit. **Wave 1** lanes 1.A–1.D will refactor each
> role's `Analytics.tsx` page to consume these components. Do not migrate
> Analytics pages here.

## What's in the kit

| File | Recharts shape | Purpose |
|------|----------------|---------|
| `EngagementChart.tsx` | `BarChart` | Per‑member / per‑coach engagement bars |
| `GoalsBreakdownChart.tsx` | `PieChart` | Goal status / category breakdown |
| `CostTrendChart.tsx` | `LineChart` | Cost‑per‑user trend over time, optional second series for baseline / forecast |
| `UtilizationAreaChart.tsx` | `AreaChart` | Capacity / utilisation, optional stacked mode |
| `FunnelChart.tsx` | `BarChart` (vertical) | Pipeline / hiring funnel with stage labels |
| `LoadingSkeleton.tsx` | — | Uniform skeleton used by every chart's `loading` state |

Re‑exports live in `index.ts`:

```ts
import {
  EngagementChart,
  GoalsBreakdownChart,
  CostTrendChart,
  UtilizationAreaChart,
  FunnelChart,
  LoadingSkeleton,
} from "@/components/analytics/charts"
```

## Common prop contract

Every chart accepts the same five state props plus its data‑shape props:

```ts
type CommonChartProps = {
  loading?: boolean
  error?: Error | string | null
  emptyState?: React.ReactNode
  title: string
  subtitle?: string
  height?: number       // default 200–220 depending on chart
  className?: string
}
```

Render rules (enforced inside `<ChartShell>`):

1. `loading` truthy → render `<LoadingSkeleton height={height} />`
2. else `error` truthy → render an inline error pill with the error message
3. else data is empty → render the `emptyState` node (or `"No data available."` fallback)
4. otherwise → render the chart

Every chart wraps its body in `<DataCard title={title}>` from
`@/components/dashboard/DataCard`. `subtitle` renders as a small grey line
inside the card, above the chart body.

## Examples

### EngagementChart

```tsx
<EngagementChart
  title="Coaching Engagement"
  subtitle="Sessions per team member, last 30 days"
  data={engagementData}        // [{ name: "Alex T.", sessions: 12 }, ...]
  xKey="name"
  valueKey="sessions"
  loading={isLoading}
  error={error}
  emptyState="No sessions logged yet."
/>
```

### GoalsBreakdownChart

```tsx
<GoalsBreakdownChart
  title="Goal Completion"
  data={goalsData}             // [{ name: "Completed", value: 12 }, ...]
  loading={isLoading}
  error={error}
/>
```

### CostTrendChart (dual series)

```tsx
<CostTrendChart
  title="Cost per Active User"
  data={costData}              // [{ month: "Jan", cost: 1.2, baseline: 1.0 }, ...]
  xKey="month"
  primary={{ key: "cost", label: "Actual", color: "#3B5BFF" }}
  secondary={{ key: "baseline", label: "Baseline", color: "#10B981" }}
  loading={isLoading}
  error={error}
/>
```

### UtilizationAreaChart (stacked)

```tsx
<UtilizationAreaChart
  title="Practitioner Utilisation"
  data={utilData}              // [{ week: "W1", booked: 60, available: 40 }, ...]
  xKey="week"
  series={[
    { key: "booked", label: "Booked" },
    { key: "available", label: "Available" },
  ]}
  stacked
/>
```

### FunnelChart

```tsx
<FunnelChart
  title="Hiring Pipeline"
  data={[
    { name: "Applied", value: 47 },
    { name: "Screening", value: 18 },
    { name: "Interview", value: 8 },
    { name: "Offer", value: 3 },
    { name: "Hired", value: 2 },
  ]}
/>
```

## Testing

Tests live in `__tests__/` next to the source files. Each chart asserts the
four contract states: loading skeleton, error pill, empty‑state node, and
happy‑path render with seeded data. Recharts is mocked through the helper at
`test-support/rechartsMock.ts` to avoid SVG rendering issues in jsdom.

Run only this kit's tests:

```bash
npx jest src/components/analytics/charts
```

## Migration note (Wave 1)

Lanes 1.A–1.D of Wave 1 will refactor each role's Analytics page onto this
kit. The migration is mechanical: replace inline `<ResponsiveContainer>` /
`<BarChart>` / `<PieChart>` / `<LineChart>` blocks with the matching kit
component, and pass through `loading`, `error`, and an `emptyState` from the
existing analytics hooks.

- `src/pages/manager/Analytics.tsx` → Lane 1.A
- `src/pages/company-admin/Analytics.tsx` → Lane 1.B
- `src/pages/super-admin/Analytics.tsx` → Lane 1.C
- `src/pages/practitioner/Analytics.tsx` and `src/pages/distributor/Analytics.tsx` → Lane 1.D

Do **not** edit any of those pages in this lane.
