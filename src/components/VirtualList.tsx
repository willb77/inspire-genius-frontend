import { useState, useRef, useEffect, useCallback } from "react"

type VirtualListProps<T> = {
  items: T[]
  itemHeight: number
  overscan?: number
  renderItem: (item: T, index: number) => React.ReactNode
  className?: string
}

export default function VirtualList<T>({ items, itemHeight, overscan = 5, renderItem, className }: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(400)

  useEffect(() => {
    if (containerRef.current) setContainerHeight(containerRef.current.clientHeight)
  }, [])

  const handleScroll = useCallback(() => {
    if (containerRef.current) setScrollTop(containerRef.current.scrollTop)
  }, [])

  const totalHeight = items.length * itemHeight
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const endIndex = Math.min(items.length, Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan)
  const visibleItems = items.slice(startIndex, endIndex)

  return (
    <div ref={containerRef} onScroll={handleScroll} className={className} style={{ overflow: "auto", position: "relative" }}>
      <div style={{ height: totalHeight, position: "relative" }}>
        {visibleItems.map((item, i) => (
          <div key={startIndex + i} style={{ position: "absolute", top: (startIndex + i) * itemHeight, height: itemHeight, left: 0, right: 0 }}>
            {renderItem(item, startIndex + i)}
          </div>
        ))}
      </div>
    </div>
  )
}
