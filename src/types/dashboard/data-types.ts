import type React from "react"

export type StatCardData = {
  label: string
  value: string | number
  change?: string
  changeColor?: string
  icon: React.ComponentType<{ className?: string }>
  iconColor: string
  iconBg: string
}

export type PRISMDimension = {
  label: string
  value: number
  bg: string
  color: string
}

export type UpcomingEvent = {
  id: string
  title: string
  time: string
  color: string
}

export type ActivityItem = {
  id: string
  text: string
  time: string
  dotColor: string
}
