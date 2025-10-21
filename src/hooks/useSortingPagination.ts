import { useMemo, useState } from 'react'

export type SortDirection = 'asc' | 'desc' | undefined

export function useSortingPagination<T extends Record<string, unknown>>(rows: T[], pageSize: number) {
  const [sortKey, setSortKey] = useState<keyof T | undefined>()
  const [sortDirection, setSortDirection] = useState<SortDirection>()
  const [page, setPage] = useState(1)

  const onSortChange = (key: string) => {
    if (!key) return
    const k = key as keyof T
    if (sortKey === k) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : prev === 'desc' ? undefined : 'asc'))
    } else {
      setSortKey(k)
      setSortDirection('asc')
    }
    setPage(1)
  }

  const compare = (av: unknown, bv: unknown) => {
    if (typeof av === 'number' && typeof bv === 'number') return av - bv
    return String(av).localeCompare(String(bv))
  }

  const sortedRows = useMemo(() => {
    if (!sortKey || !sortDirection) return rows
    const copy = [...rows]
    copy.sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      const cmp = compare(av, bv)
      return sortDirection === 'asc' ? cmp : -cmp
    })
    return copy
  }, [rows, sortKey, sortDirection])

  const total = sortedRows.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const start = (page - 1) * pageSize
  const paginated = sortedRows.slice(start, start + pageSize)

  return {
    sortKey,
    sortDirection,
    page,
    setPage,
    onSortChange,
    sortedRows,
    paginated,
    total,
    totalPages,
    start,
    pageSize,
  }
}
