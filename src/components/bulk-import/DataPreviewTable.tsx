import { useState, useCallback, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertCircle, CheckCircle2, Trash2, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { validateRecords } from "@/lib/bulk-import/validation"
import type { RawUserRecord, ValidationResult, ValidationError, BulkUserRecord } from "@/types/bulk-import"

type DataPreviewTableProps = {
  records: RawUserRecord[]
  onRecordsChange: (records: RawUserRecord[]) => void
  onProceed: (validRecords: BulkUserRecord[]) => void
  callerRole?: "manager" | "company-admin" | "super-admin"
}

const PAGE_SIZE = 50

type EditableField = "fname" | "lname" | "email1" | "email2" | "user_type"

type EditingCell = {
  row: number
  field: EditableField
} | null

const USER_TYPE_OPTIONS = [
  { value: "user", label: "User" },
  { value: "manager", label: "Manager" },
  { value: "company-admin", label: "Company Admin" },
  { value: "super-admin", label: "Super Admin" },
]

export function DataPreviewTable({
  records,
  onRecordsChange,
  onProceed,
  callerRole = "company-admin",
}: DataPreviewTableProps) {
  const [validation, setValidation] = useState<ValidationResult>({ valid: [], invalid: [], duplicates: [] })
  const [editingCell, setEditingCell] = useState<EditingCell>(null)
  const [currentPage, setCurrentPage] = useState(0)

  useEffect(() => {
    setValidation(validateRecords(records, callerRole))
  }, [records, callerRole])

  // Build a per-row error map for quick lookup
  const rowErrors = useMemo(() => {
    const map = new Map<number, ValidationError[]>()
    for (const item of validation.invalid) {
      map.set(item.row - 1, item.errors) // row is 1-indexed in ValidationResult
    }
    return map
  }, [validation])

  const totalPages = Math.ceil(records.length / PAGE_SIZE)
  const paginatedIndices = useMemo(() => {
    const start = currentPage * PAGE_SIZE
    const end = Math.min(start + PAGE_SIZE, records.length)
    return Array.from({ length: end - start }, (_, i) => start + i)
  }, [currentPage, records.length])

  const validCount = validation.valid.length
  const invalidCount = validation.invalid.length
  const totalCount = records.length
  const hasInvalidRows = invalidCount > 0

  const handleCellChange = useCallback(
    (rowIndex: number, field: EditableField, value: string) => {
      const updated = [...records]
      updated[rowIndex] = { ...updated[rowIndex], [field]: value }
      onRecordsChange(updated)
    },
    [records, onRecordsChange],
  )

  const handleCellBlur = useCallback(() => {
    setEditingCell(null)
  }, [])

  const handleCellKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === "Escape") handleCellBlur()
    },
    [handleCellBlur],
  )

  const handleDeleteRow = useCallback(
    (rowIndex: number) => {
      const updated = records.filter((_, i) => i !== rowIndex)
      onRecordsChange(updated)
      setEditingCell(null)
      const newTotalPages = Math.ceil(updated.length / PAGE_SIZE)
      if (currentPage >= newTotalPages && newTotalPages > 0) {
        setCurrentPage(newTotalPages - 1)
      }
    },
    [records, onRecordsChange, currentPage],
  )

  const handleRemoveAllInvalid = useCallback(() => {
    const invalidRows = new Set(validation.invalid.map((item) => item.row - 1))
    const updated = records.filter((_, i) => !invalidRows.has(i))
    onRecordsChange(updated)
    setEditingCell(null)
    setCurrentPage(0)
  }, [records, validation, onRecordsChange])

  const handleRevalidateAll = useCallback(() => {
    setValidation(validateRecords(records, callerRole))
  }, [records, callerRole])

  const handleProceed = useCallback(() => {
    onProceed(validation.valid.map((v) => v.record))
  }, [validation, onProceed])

  const renderCell = (rowIndex: number, field: EditableField, value: string | undefined) => {
    const isEditing = editingCell?.row === rowIndex && editingCell?.field === field
    const displayValue = value ?? ""

    if (isEditing && field === "user_type") {
      return (
        <Select
          value={displayValue}
          onValueChange={(v) => {
            handleCellChange(rowIndex, field, v)
            handleCellBlur()
          }}
        >
          <SelectTrigger className="h-8 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {USER_TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }

    if (isEditing) {
      return (
        <Input
          className="h-8"
          value={displayValue}
          onChange={(e) => handleCellChange(rowIndex, field, e.target.value)}
          onBlur={handleCellBlur}
          onKeyDown={handleCellKeyDown}
          autoFocus
        />
      )
    }

    return (
      <span
        className="cursor-text select-none"
        onDoubleClick={() => setEditingCell({ row: rowIndex, field })}
      >
        {displayValue || "\u2014"}
      </span>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center justify-between rounded-lg border bg-muted/50 px-4 py-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium">{validCount} valid</span>
          </div>
          <div className="flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <span className="text-sm font-medium">{invalidCount} invalid</span>
          </div>
          <span className="text-sm text-muted-foreground">{totalCount} total rows</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRemoveAllInvalid} disabled={invalidCount === 0}>
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Remove All Invalid
          </Button>
          <Button variant="outline" size="sm" onClick={handleRevalidateAll}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Revalidate All
          </Button>
        </div>
      </div>

      {/* Data table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Row #</TableHead>
              <TableHead>First Name</TableHead>
              <TableHead>Last Name</TableHead>
              <TableHead>Email 1</TableHead>
              <TableHead>Email 2</TableHead>
              <TableHead className="w-36">User Type</TableHead>
              <TableHead className="w-24">Status</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedIndices.map((rowIndex) => {
              const record = records[rowIndex]
              const errors = rowErrors.get(rowIndex)
              const isInvalid = !!errors

              return (
                <TableRow
                  key={rowIndex}
                  className={cn(
                    isInvalid && "bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50",
                  )}
                >
                  <TableCell className="font-mono text-xs text-muted-foreground">{rowIndex + 1}</TableCell>
                  <TableCell>{renderCell(rowIndex, "fname", record.fname)}</TableCell>
                  <TableCell>{renderCell(rowIndex, "lname", record.lname)}</TableCell>
                  <TableCell>{renderCell(rowIndex, "email1", record.email1)}</TableCell>
                  <TableCell>{renderCell(rowIndex, "email2", record.email2)}</TableCell>
                  <TableCell>{renderCell(rowIndex, "user_type", record.user_type)}</TableCell>
                  <TableCell>
                    {isInvalid ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="destructive" className="cursor-help gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {errors.length} {errors.length === 1 ? "error" : "errors"}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="max-w-xs">
                            <ul className="list-disc space-y-0.5 pl-4 text-xs">
                              {errors.map((err, i) => (
                                <li key={i}>
                                  <strong>{err.field}:</strong> {err.message}
                                </li>
                              ))}
                            </ul>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <Badge
                        variant="outline"
                        className="gap-1 border-green-300 text-green-700 dark:border-green-700 dark:text-green-400"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        Valid
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteRow(rowIndex)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span className="sr-only">Delete row {rowIndex + 1}</span>
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
            {records.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  No records to display. Upload a file to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Showing rows {currentPage * PAGE_SIZE + 1}
            {"\u2013"}
            {Math.min((currentPage + 1) * PAGE_SIZE, totalCount)} of {totalCount}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={currentPage === 0} onClick={() => setCurrentPage((p) => p - 1)}>
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage + 1} of {totalPages}
            </span>
            <Button variant="outline" size="sm" disabled={currentPage >= totalPages - 1} onClick={() => setCurrentPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Proceed button */}
      <div className="flex justify-end pt-2">
        <Button size="lg" disabled={hasInvalidRows || totalCount === 0} onClick={handleProceed}>
          Proceed to Import ({validCount} {validCount === 1 ? "user" : "users"})
        </Button>
      </div>
    </div>
  )
}
