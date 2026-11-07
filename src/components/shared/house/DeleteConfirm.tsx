import React from "react"
import ConfirmDialog from "@/components/shared/ConfirmDialog"
import { BUTTON_WORDS } from "@/lib/house/glossary"

export interface DeleteConfirmProps {
  /** The thing being deleted, as people know it: "this client", "expired data". */
  thing: string
  trigger: React.ReactNode
  onConfirm: () => void | Promise<void>
}

/**
 * House-style confirmation for every destructive action — always the same
 * words: "Delete {thing}? This can't be undone."
 */
export function DeleteConfirm({ thing, trigger, onConfirm }: DeleteConfirmProps) {
  return (
    <ConfirmDialog
      trigger={trigger}
      title={`${BUTTON_WORDS.delete} ${thing}?`}
      description="This can't be undone."
      confirmText={BUTTON_WORDS.delete}
      cancelText={BUTTON_WORDS.cancel}
      confirmVariant="destructive"
      onConfirm={onConfirm}
    />
  )
}
