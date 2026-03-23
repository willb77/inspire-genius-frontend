import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"

type LazyImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  fallback?: string
}

export default function LazyImage({ src, alt, className, fallback, ...props }: LazyImageProps) {
  const [loaded, setLoaded] = useState(false)
  const [inView, setInView] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setInView(true); observer.disconnect() }
    }, { rootMargin: "200px" })
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} className={cn("bg-[#f3f4f6] overflow-hidden", className)}>
      {inView && (
        <img
          src={src ?? fallback}
          alt={alt ?? ""}
          onLoad={() => setLoaded(true)}
          className={cn("transition-opacity duration-300", loaded ? "opacity-100" : "opacity-0")}
          loading="lazy"
          {...props}
        />
      )}
    </div>
  )
}
