import { useReducer, useCallback } from "react"
import ManagerLayout from "@/layouts/ManagerLayout"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  Upload,
  ClipboardCheck,
  UserPlus,
  Mail,
  Send,
  BarChart3,
  ChevronLeft,
  Check,
} from "lucide-react"

import { FileUploader } from "@/components/bulk-import/FileUploader"
import { DataPreviewTable } from "@/components/bulk-import/DataPreviewTable"
import { ImportProgress } from "@/components/bulk-import/ImportProgress"
import { InvitationComposer } from "@/components/bulk-import/InvitationComposer"
import { RecipientSelector } from "@/components/bulk-import/RecipientSelector"
import { DeliveryTracker } from "@/components/bulk-import/DeliveryTracker"

import {
  useBulkImport,
  useSendInvitations,
  useInvitationStatus,
  useResendInvitation,
} from "@/hooks/useBulkImport"

import type {
  RawUserRecord,
  BulkUserRecord,
  BulkImportStep,
  ImportedUser,
} from "@/types/bulk-import"

// ── Steps config ──
const STEPS: { key: BulkImportStep; label: string; icon: typeof Upload }[] = [
  { key: "upload", label: "Upload", icon: Upload },
  { key: "validate", label: "Validate", icon: ClipboardCheck },
  { key: "import", label: "Import", icon: UserPlus },
  { key: "compose", label: "Compose", icon: Mail },
  { key: "send", label: "Send", icon: Send },
  { key: "track", label: "Track", icon: BarChart3 },
]

// ── State management ──
type State = {
  currentStep: BulkImportStep
  parsedRecords: RawUserRecord[]
  validRecords: BulkUserRecord[]
  importedUsers: ImportedUser[]
  customMessage: string
  selectedUserIds: string[]
  importBatchId: string | null
  invitationBatchId: string | null
}

type Action =
  | { type: "SET_PARSED"; records: RawUserRecord[] }
  | { type: "SET_VALID"; records: BulkUserRecord[] }
  | { type: "SET_IMPORTED"; users: ImportedUser[]; batchId: string }
  | { type: "SET_CUSTOM_MESSAGE"; message: string }
  | { type: "SET_SELECTED_IDS"; ids: string[] }
  | { type: "SET_INVITATION_BATCH"; batchId: string }
  | { type: "GO_TO_STEP"; step: BulkImportStep }
  | { type: "RESET" }

const initialState: State = {
  currentStep: "upload",
  parsedRecords: [],
  validRecords: [],
  importedUsers: [],
  customMessage: "",
  selectedUserIds: [],
  importBatchId: null,
  invitationBatchId: null,
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_PARSED":
      return { ...state, parsedRecords: action.records, currentStep: "validate" }
    case "SET_VALID":
      return { ...state, validRecords: action.records, currentStep: "import" }
    case "SET_IMPORTED":
      return {
        ...state,
        importedUsers: action.users,
        importBatchId: action.batchId,
        currentStep: "compose",
      }
    case "SET_CUSTOM_MESSAGE":
      return { ...state, customMessage: action.message }
    case "SET_SELECTED_IDS":
      return { ...state, selectedUserIds: action.ids }
    case "SET_INVITATION_BATCH":
      return { ...state, invitationBatchId: action.batchId, currentStep: "track" }
    case "GO_TO_STEP":
      return { ...state, currentStep: action.step }
    case "RESET":
      return initialState
    default:
      return state
  }
}

function stepIndex(step: BulkImportStep): number {
  return STEPS.findIndex((s) => s.key === step)
}

// ── Component ──
export default function ManagerBulkImport() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const currentIdx = stepIndex(state.currentStep)

  // Mutations & queries
  const importMutation = useBulkImport()
  const sendMutation = useSendInvitations()
  const resendMutation = useResendInvitation()
  const { data: invitationStatus, isLoading: isTrackingLoading } = useInvitationStatus(
    state.invitationBatchId,
  )

  // ── Handlers ──
  const handleFilesParsed = useCallback((records: RawUserRecord[]) => {
    dispatch({ type: "SET_PARSED", records })
  }, [])

  const handleRecordsChange = useCallback((records: RawUserRecord[]) => {
    dispatch({ type: "SET_PARSED", records })
    dispatch({ type: "GO_TO_STEP", step: "validate" })
  }, [])

  const handleProceedToImport = useCallback(
    (validRecords: BulkUserRecord[]) => {
      dispatch({ type: "SET_VALID", records: validRecords })
      importMutation.mutate(validRecords, {
        onSuccess: (data) => {
          const imported: ImportedUser[] = data.results
            .filter((r) => r.status === "success" && r.user_id)
            .map((r) => {
              const original = validRecords.find((vr) => vr.email1 === r.email)
              return {
                user_id: r.user_id!,
                fname: original?.fname ?? "",
                lname: original?.lname ?? "",
                email1: r.email,
                email2: original?.email2,
                user_type: original?.user_type ?? "user",
              }
            })
          dispatch({ type: "SET_IMPORTED", users: imported, batchId: data.batch_id })
        },
      })
    },
    [importMutation],
  )

  const handleContinueToSend = useCallback(() => {
    dispatch({ type: "GO_TO_STEP", step: "send" })
    dispatch({
      type: "SET_SELECTED_IDS",
      ids: state.importedUsers.map((u) => u.user_id),
    })
  }, [state.importedUsers])

  const handleSendInvitations = useCallback(() => {
    if (!state.importBatchId) return
    sendMutation.mutate(
      {
        batch_id: state.importBatchId,
        user_ids: state.selectedUserIds,
        custom_message: state.customMessage,
      },
      {
        onSuccess: (data) => {
          dispatch({ type: "SET_INVITATION_BATCH", batchId: data.invitation_batch_id })
        },
      },
    )
  }, [sendMutation, state.importBatchId, state.selectedUserIds, state.customMessage])

  const canGoBack = currentIdx > 0 && state.currentStep !== "track"

  return (
    <ManagerLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Bulk Team Import</h1>
            <p className="text-muted-foreground">
              Upload a file to import team members and send invitation emails
            </p>
          </div>
          {state.currentStep !== "upload" && (
            <Button variant="outline" size="sm" onClick={() => dispatch({ type: "RESET" })}>
              Start Over
            </Button>
          )}
        </div>

        {/* Stepper */}
        <nav className="flex items-center justify-between">
          {STEPS.map((step, idx) => {
            const Icon = step.icon
            const isCompleted = idx < currentIdx
            const isCurrent = idx === currentIdx
            return (
              <div key={step.key} className="flex flex-1 items-center">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors",
                      isCompleted && "border-green-500 bg-green-500 text-white",
                      isCurrent && "border-primary bg-primary text-primary-foreground",
                      !isCompleted && !isCurrent && "border-muted-foreground/30 text-muted-foreground/50",
                    )}
                  >
                    {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                  </div>
                  <span
                    className={cn(
                      "text-xs font-medium",
                      isCurrent && "text-primary",
                      isCompleted && "text-green-600",
                      !isCompleted && !isCurrent && "text-muted-foreground/50",
                    )}
                  >
                    {step.label}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "mx-2 h-0.5 flex-1",
                      idx < currentIdx ? "bg-green-500" : "bg-muted-foreground/20",
                    )}
                  />
                )}
              </div>
            )
          })}
        </nav>

        {/* Back button */}
        {canGoBack && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => dispatch({ type: "GO_TO_STEP", step: STEPS[currentIdx - 1].key })}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
        )}

        {/* Step content */}
        {state.currentStep === "upload" && (
          <FileUploader onParsed={handleFilesParsed} />
        )}

        {state.currentStep === "validate" && (
          <DataPreviewTable
            records={state.parsedRecords}
            onRecordsChange={handleRecordsChange}
            onProceed={handleProceedToImport}
            callerRole="manager"
          />
        )}

        {state.currentStep === "import" && (
          <ImportProgress
            isLoading={importMutation.isPending}
            data={importMutation.data}
            onContinue={() => dispatch({ type: "GO_TO_STEP", step: "compose" })}
          />
        )}

        {state.currentStep === "compose" && (
          <InvitationComposer
            importedUsers={state.importedUsers}
            customMessage={state.customMessage}
            onCustomMessageChange={(msg) =>
              dispatch({ type: "SET_CUSTOM_MESSAGE", message: msg })
            }
            onContinue={handleContinueToSend}
          />
        )}

        {state.currentStep === "send" && (
          <RecipientSelector
            users={state.importedUsers}
            selectedIds={state.selectedUserIds}
            onSelectedIdsChange={(ids) =>
              dispatch({ type: "SET_SELECTED_IDS", ids })
            }
            onSend={handleSendInvitations}
            isSending={sendMutation.isPending}
          />
        )}

        {state.currentStep === "track" && (
          <DeliveryTracker
            data={invitationStatus}
            isLoading={isTrackingLoading}
            onResend={(id) => resendMutation.mutate(id)}
            isResending={resendMutation.isPending}
          />
        )}
      </div>
    </ManagerLayout>
  )
}
