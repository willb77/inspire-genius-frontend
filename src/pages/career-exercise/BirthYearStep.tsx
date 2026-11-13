import { useMemo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import type { AxiosError } from "axios"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRecordBirthYear } from "@/hooks/career-exercise/useCareerExercise"
import type { AgeStep } from "@/types/career-exercise/student"
import { birthYearSchema, type BirthYearForm, type BirthYearInput } from "./birthYear.schema"
import { exerciseErrorMessage } from "./exerciseErrors"

/**
 * CX-AGE — one neutral question before the exercise starts, shown only when
 * the server says there is no age on file for the person.
 *
 * It asks the year and nothing else: no "are you over N" question, no hint of any
 * cut-off. The server keeps only an age band (never the year) and answers with
 * whether to ask again and where next; this component hands that answer up and
 * the page re-checks. A 409 (an age is already on file) is not an error to the
 * person — the page simply re-checks and moves on.
 */
export function BirthYearStep({ onDone }: { onDone: (answer: AgeStep | null) => void }) {
  const record = useRecordBirthYear()
  const schema = useMemo(() => birthYearSchema(), [])
  const form = useForm<BirthYearInput, unknown, BirthYearForm>({
    resolver: zodResolver(schema),
    defaultValues: { birthYear: "" },
  })

  const onSubmit = form.handleSubmit(({ birthYear }) => {
    record.mutate(birthYear, {
      onSuccess: (answer) => onDone(answer),
      onError: (err) => {
        if ((err as AxiosError).response?.status === 409) onDone(null)
      },
    })
  })

  const status = (record.error as AxiosError | null)?.response?.status
  const failure =
    record.isError && status !== 409
      ? status === 422
        ? "Enter the year you were born, for example 2001."
        : exerciseErrorMessage(record.error, "Your answer could not be saved. Try again shortly.")
      : null

  return (
    <section aria-labelledby="birth-year-heading" className="max-w-md rounded-xl border bg-card p-6 text-sm">
      <h2 id="birth-year-heading" className="text-base font-semibold">
        Before we start
      </h2>
      <p className="mt-1 text-muted-foreground">
        One quick question so the exercise fits you. We only keep a general age range, not the year itself.
      </p>
      <form onSubmit={onSubmit} className="mt-4 space-y-2" noValidate>
        <Label htmlFor="career-exercise-birth-year">What year were you born?</Label>
        <div className="flex items-start gap-2">
          <Input
            id="career-exercise-birth-year"
            inputMode="numeric"
            autoComplete="bday-year"
            maxLength={4}
            placeholder="YYYY"
            className="w-28"
            aria-invalid={!!form.formState.errors.birthYear}
            aria-describedby={form.formState.errors.birthYear ? "career-exercise-birth-year-error" : undefined}
            {...form.register("birthYear")}
          />
          <Button type="submit" disabled={record.isPending}>
            {record.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
            Continue
          </Button>
        </div>
        {form.formState.errors.birthYear && (
          <p id="career-exercise-birth-year-error" className="text-xs text-destructive">
            {form.formState.errors.birthYear.message}
          </p>
        )}
        {failure && (
          <div role="alert" className="rounded-lg border border-destructive/40 p-3 text-sm">
            {failure}
          </div>
        )}
      </form>
    </section>
  )
}
