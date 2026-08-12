/**
 * Minimal, dependency-free document SEO for client-rendered pages: sets the
 * document title, the meta description, a canonical link, and an optional
 * Schema.org JSON-LD block — and cleans up the elements it created on unmount so
 * one page's structured data never leaks onto the next.
 */
import { useEffect } from "react"

type SeoOptions = {
  title: string
  description?: string
  /** Canonical absolute URL. Defaults to the current href. */
  canonical?: string
  /** Schema.org JSON-LD object (rendered into a <script type=ld+json>). */
  jsonLd?: Record<string, unknown> | null
}

function upsertMeta(name: string, content: string): { el: HTMLMetaElement; created: boolean } {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
  let created = false
  if (!el) {
    el = document.createElement("meta")
    el.setAttribute("name", name)
    document.head.appendChild(el)
    created = true
  }
  el.setAttribute("content", content)
  return { el, created }
}

function upsertLink(rel: string, href: string): { el: HTMLLinkElement; created: boolean } {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  let created = false
  if (!el) {
    el = document.createElement("link")
    el.setAttribute("rel", rel)
    document.head.appendChild(el)
    created = true
  }
  el.setAttribute("href", href)
  return { el, created }
}

export function useSeo({ title, description, canonical, jsonLd }: SeoOptions): void {
  useEffect(() => {
    const prevTitle = document.title
    document.title = title

    const cleanups: Array<() => void> = [() => { document.title = prevTitle }]

    if (description) {
      const { el, created } = upsertMeta("description", description)
      const prev = created ? null : el.getAttribute("content")
      cleanups.push(() => {
        if (created) el.remove()
        else if (prev !== null) el.setAttribute("content", prev)
      })
    }

    const href = canonical ?? window.location.href
    const { el: linkEl, created: linkCreated } = upsertLink("canonical", href)
    const prevHref = linkCreated ? null : linkEl.getAttribute("href")
    cleanups.push(() => {
      if (linkCreated) linkEl.remove()
      else if (prevHref !== null) linkEl.setAttribute("href", prevHref)
    })

    if (jsonLd) {
      const script = document.createElement("script")
      script.type = "application/ld+json"
      script.setAttribute("data-role-page", "true")
      script.textContent = JSON.stringify(jsonLd)
      document.head.appendChild(script)
      cleanups.push(() => script.remove())
    }

    return () => cleanups.forEach((fn) => fn())
  }, [title, description, canonical, jsonLd])
}
