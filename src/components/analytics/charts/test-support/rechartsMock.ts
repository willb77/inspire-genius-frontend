import React from "react"

type WithChildren = { children?: React.ReactNode }

const passthrough = (testid: string) =>
  ({ children }: WithChildren) =>
    React.createElement("div", { "data-testid": testid }, children)

const noop = () => null

export const rechartsMock = {
  ResponsiveContainer: passthrough("responsive-container"),
  BarChart: passthrough("bar-chart"),
  Bar: passthrough("bar"),
  PieChart: passthrough("pie-chart"),
  Pie: passthrough("pie"),
  Cell: noop,
  LineChart: passthrough("line-chart"),
  Line: passthrough("line"),
  AreaChart: passthrough("area-chart"),
  Area: passthrough("area"),
  XAxis: noop,
  YAxis: noop,
  CartesianGrid: noop,
  Tooltip: noop,
  Legend: noop,
  LabelList: noop,
}
