import { useState, useRef, useCallback } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, File, X, FileSpreadsheet, FileJson, FileCode } from "lucide-react"
import { toast } from "sonner"
import { parseFile, SUPPORTED_EXTENSIONS, MAX_FILE_SIZE } from "@/lib/bulk-import/parsers"
import type { RawUserRecord } from "@/types/bulk-import"

type FileUploaderProps = {
  onParsed: (records: RawUserRecord[]) => void
  disabled?: boolean
}

const ACCEPT_STRING = SUPPORTED_EXTENSIONS.map((ext) => `.${ext}`).join(",")

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function detectFormat(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? ""
  switch (ext) {
    case "csv":
      return "CSV"
    case "xlsx":
      return "Excel (XLSX)"
    case "xls":
      return "Excel (XLS)"
    case "json":
      return "JSON"
    case "xml":
      return "XML"
    default:
      return ext.toUpperCase()
  }
}

function FormatIcon({ fileName }: { fileName: string }) {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? ""
  switch (ext) {
    case "csv":
    case "xlsx":
    case "xls":
      return <FileSpreadsheet className="h-8 w-8 text-emerald-500" />
    case "json":
      return <FileJson className="h-8 w-8 text-amber-500" />
    case "xml":
      return <FileCode className="h-8 w-8 text-blue-500" />
    default:
      return <File className="h-8 w-8 text-muted-foreground" />
  }
}

export function FileUploader({ onParsed, disabled = false }: FileUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isParsing, setIsParsing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    async (file: File) => {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
      if (!SUPPORTED_EXTENSIONS.includes(ext)) {
        toast.error("Unsupported file format", {
          description: `Accepted formats: ${SUPPORTED_EXTENSIONS.join(", ")}`,
        })
        return
      }

      if (file.size > MAX_FILE_SIZE) {
        toast.error("File too large", {
          description: `Maximum file size is ${formatFileSize(MAX_FILE_SIZE)}. Your file is ${formatFileSize(file.size)}.`,
        })
        return
      }

      setSelectedFile(file)
      setIsParsing(true)

      try {
        const records = await parseFile(file)
        onParsed(records)
        toast.success("File parsed successfully", {
          description: `${records.length} record${records.length === 1 ? "" : "s"} found.`,
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to parse file"
        toast.error("Parse error", { description: message })
        setSelectedFile(null)
      } finally {
        setIsParsing(false)
      }
    },
    [onParsed],
  )

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      if (!disabled) setIsDragOver(true)
    },
    [disabled],
  )

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)

      if (disabled) return

      const file = e.dataTransfer.files?.[0]
      if (file) handleFile(file)
    },
    [disabled, handleFile],
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
      if (inputRef.current) inputRef.current.value = ""
    },
    [handleFile],
  )

  const handleRemove = useCallback(() => {
    setSelectedFile(null)
    setIsParsing(false)
    if (inputRef.current) inputRef.current.value = ""
  }, [])

  const handleClick = useCallback(() => {
    if (!disabled && !selectedFile) {
      inputRef.current?.click()
    }
  }, [disabled, selectedFile])

  return (
    <Card
      className={cn(
        "border-2 border-dashed transition-colors duration-200",
        isDragOver && !disabled && "border-primary bg-primary/5",
        !isDragOver && !selectedFile && "border-muted-foreground/25 hover:border-muted-foreground/50",
        selectedFile && "border-solid border-muted-foreground/20",
        disabled && "cursor-not-allowed opacity-50",
        !disabled && !selectedFile && "cursor-pointer",
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <CardContent className="flex flex-col items-center justify-center p-8">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_STRING}
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled}
        />

        {isParsing ? (
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted-foreground/20 border-t-primary" />
            <p className="text-sm text-muted-foreground">Parsing file...</p>
          </div>
        ) : selectedFile ? (
          <div className="flex w-full items-center gap-4">
            <FormatIcon fileName={selectedFile.name} />
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium">{selectedFile.name}</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {formatFileSize(selectedFile.size)}
                </span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {detectFormat(selectedFile.name)}
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={(e) => {
                e.stopPropagation()
                handleRemove()
              }}
              disabled={disabled}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Remove file</span>
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-center">
            <div
              className={cn(
                "rounded-full p-3 transition-colors",
                isDragOver ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
              )}
            >
              <Upload className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium">
                Drag and drop your file here
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                or click to browse
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Supports CSV, Excel (.xlsx, .xls), JSON, and XML — max {formatFileSize(MAX_FILE_SIZE)}
            </p>
            <div className="mt-3 rounded-md bg-muted/50 p-3 text-left w-full max-w-md">
              <p className="text-xs font-medium mb-1">Required columns:</p>
              <p className="text-xs text-muted-foreground font-mono">First Name, Last Name, Email</p>
              <p className="text-xs text-muted-foreground mt-1">Optional: Email 2, Role (user/manager/company-admin)</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
