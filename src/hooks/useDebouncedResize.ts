import { useState, useEffect } from "react"

export function useDebouncedResize(delay = 150) {
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight })
  useEffect(() => {
    let timer: number
    function handle() {
      clearTimeout(timer)
      timer = window.setTimeout(() => setSize({ width: window.innerWidth, height: window.innerHeight }), delay)
    }
    window.addEventListener("resize", handle)
    return () => { window.removeEventListener("resize", handle); clearTimeout(timer) }
  }, [delay])
  return size
}
