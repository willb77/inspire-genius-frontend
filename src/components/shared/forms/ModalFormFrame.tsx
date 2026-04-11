"use client"

import React from 'react'
import ModalDialog from '@/components/shared/ModalDialog'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { useForm, type FieldValues, type UseFormReturn, type DefaultValues } from 'react-hook-form'

export type ModalFormFrameProps<T extends FieldValues> = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  mode: 'add' | 'edit'
  defaultValues: DefaultValues<T>
  submitLabel: string
  onSubmit: (values: T) => void | Promise<void>
  children: (form: UseFormReturn<T>) => React.ReactNode
  className?: string
}

export default function ModalFormFrame<T extends FieldValues>(props: ModalFormFrameProps<T>) {
  const { open, onOpenChange, title, defaultValues, onSubmit, submitLabel, children, className } = props

  const form = useForm<T>({
    defaultValues,
    mode: 'onTouched',
  })

  React.useEffect(() => {
    if (open) form.reset(defaultValues)
  }, [open, defaultValues, form])

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit(values)
    onOpenChange(false)
  })

  const footer = (
    <>
      <Button
        variant="secondary"
        className="bg-gray-100 hover:bg-gray-100 text-foreground"
        onClick={() => onOpenChange(false)}
        type="button"
      >
        Cancel
      </Button>
      <Button onClick={handleSubmit} disabled={form.formState.isSubmitting} type="button">
        {submitLabel}
      </Button>
    </>
  )

  return (
    <ModalDialog open={open} onOpenChange={onOpenChange} title={title} footer={footer} className={className}>
      <Form {...form}>
        <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={(e) => e.preventDefault()}>
          {children(form)}
        </form>
      </Form>
    </ModalDialog>
  )
}
