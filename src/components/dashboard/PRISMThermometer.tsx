type PRISMThermometerProps = {
  red: number
  yellow: number
  green: number
  blue: number
  size?: "sm" | "md"
}

const COLORS = {
  red: "#E53E3E",
  yellow: "#ECC94B",
  green: "#38A169",
  blue: "#3182CE",
}

export default function PRISMThermometer({ red, yellow, green, blue, size = "sm" }: PRISMThermometerProps) {
  const total = red + yellow + green + blue
  if (total === 0) return null
  const h = size === "sm" ? "h-2" : "h-3"

  return (
    <div className={`flex rounded-full overflow-hidden ${h} w-full min-w-[80px]`}>
      <div className={h} style={{ width: `${(red / total) * 100}%`, backgroundColor: COLORS.red }} />
      <div className={h} style={{ width: `${(yellow / total) * 100}%`, backgroundColor: COLORS.yellow }} />
      <div className={h} style={{ width: `${(green / total) * 100}%`, backgroundColor: COLORS.green }} />
      <div className={h} style={{ width: `${(blue / total) * 100}%`, backgroundColor: COLORS.blue }} />
    </div>
  )
}
