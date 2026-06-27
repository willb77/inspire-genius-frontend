import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  ExternalLink,
  ClipboardCopy,
  CheckCircle2,
  Search,
  Loader2,
  UserCheck,
  UserPlus,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCheckExistingCustomer } from '@/hooks/prism/useCheckExistingCustomer'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { QUEST_TYPE_OPTIONS, PRISM_LANGUAGES } from '@/constants/prism'

// ── Zod Schema ─────────────────────────────────────────────────────
// Covers all fields needed by PRISM CreateCandidate + IG user registration

const initiateSchema = z.object({
  // User / candidate details
  forename: z.string().min(1, 'First name is required').max(50),
  surname: z.string().min(1, 'Last name is required').max(50),
  email: z.string().email('Enter a valid email address'),
  gender: z.string({ error: 'Select gender' }),
  organisation: z.string().min(1, 'Organisation is required').max(100),

  // Questionnaire config
  questionnaireTypeId: z.coerce.number({
    error: 'Select a questionnaire type',
  }),
  languageId: z.coerce.number().default(1),
  reference: z.string().max(100).optional(),

  // PRISM options
  createUser: z.boolean().default(true),
  isGift: z.boolean().default(false),
})

type InitiateFormValues = z.infer<typeof initiateSchema>

type PrismInitiateFormProps = {
  /** Disable the form (e.g. when an active assessment exists) */
  disabled?: boolean
  /** Pre-fill values from auth context or parent */
  defaultValues?: Partial<InitiateFormValues>
  /**
   * Called on submit. In the real app this calls usePrismInitiate.
   * In the test harness this shows the payload preview.
   */
  onSubmit?: (values: InitiateFormValues, apiPayload: Record<string, unknown>) => void
  /** If true, shows the full PRISM API payload preview on submit (test mode) */
  showPayloadPreview?: boolean
}

export default function PrismInitiateForm({
  disabled = false,
  defaultValues,
  onSubmit: onSubmitProp,
  showPayloadPreview = false,
}: PrismInitiateFormProps) {
  const [submittedPayload, setSubmittedPayload] = useState<Record<string, unknown> | null>(null)
  const [questionnaireUrl, setQuestionnaireUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [customerCheck, setCustomerCheck] = useState<{
    exists: boolean
    message?: string
    actionUrl?: string
  } | null>(null)

  const checkCustomer = useCheckExistingCustomer()

  const form = useForm<InitiateFormValues>({
    resolver: zodResolver(initiateSchema) as Resolver<InitiateFormValues>,
    defaultValues: {
      forename: '',
      surname: '',
      email: '',
      gender: undefined,
      organisation: '',
      languageId: 1,
      reference: '',
      createUser: true,
      isGift: false,
      ...defaultValues,
    },
  })

  function onSubmit(values: InitiateFormValues) {
    // Build the full PRISM CreateCandidate-compatible payload.
    // The top-level fields here mirror `InitiateAssessmentRequest` exactly
    // (the shape sent to POST /v1/prism/initiate): gender is converted to a
    // boolean (true = male) and isGift is passed through (true auto-unlocks
    // the report). Note: `createUser` is NOT part of InitiateAssessmentRequest
    // — it only informs the PRISM CreateCandidate mapping below and is not
    // transmitted as a top-level field.
    const apiPayload = {
      // IG backend fields — these match InitiateAssessmentRequest
      userId: 'auto-generated',
      forename: values.forename,
      surname: values.surname,
      email: values.email,
      gender: values.gender === 'male',
      organisation: values.organisation,
      reference: values.reference || `IG-${Date.now()}`,
      questionnaireTypeId: values.questionnaireTypeId,
      languageId: values.languageId,
      isGift: values.isGift,

      // These map to PRISM CreateCandidate fields (backend handles SiteID/ClientID)
      _prismMapping: {
        SiteID: '(injected by backend)',
        ClientID: '(injected by backend)',
        ExternalIdent: '(auto-generated from userId)',
        ParentExternalIdent: '(from user organisation ID)',
        Forename: values.forename,
        Surname: values.surname,
        Organisation: values.organisation,
        Reference: values.reference || `IG-${Date.now()}`,
        Email: values.email,
        Gender: values.gender === 'male',
        LangID: values.languageId,
        QTypeID: values.questionnaireTypeId,
        // CreateUser is a PRISM CreateCandidate hint only — it is not part of
        // InitiateAssessmentRequest and is not sent as a top-level field.
        CreateUser: values.createUser,
        IsGift: values.isGift,
        AccID: 0,
      },
    }

    if (showPayloadPreview) {
      setSubmittedPayload(apiPayload)
      // Simulate a questionnaire URL response
      setQuestionnaireUrl(
        `https://staging.prismbrainmapping.com/questionnaire/demo?ext=${encodeURIComponent(values.email)}`,
      )
    }

    onSubmitProp?.(values, apiPayload)
  }

  async function handleCheckCustomer() {
    // Validate just the fields the lookup needs (email + questionnaire type).
    const ok = await form.trigger(['email', 'questionnaireTypeId'])
    if (!ok) return

    const values = form.getValues()
    const res = await checkCustomer.mutateAsync({
      email: values.email,
      questionnaireTypeId: values.questionnaireTypeId,
      forename: values.forename || undefined,
      surname: values.surname || undefined,
    })
    setCustomerCheck({
      exists: res?.exists ?? false,
      message: res?.response_message,
      actionUrl: res?.action_url,
    })
  }

  function handleCopyPayload() {
    if (submittedPayload) {
      navigator.clipboard.writeText(JSON.stringify(submittedPayload, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  function handleReset() {
    setSubmittedPayload(null)
    setQuestionnaireUrl(null)
    form.reset()
  }

  // ── Success state ──
  if (submittedPayload && questionnaireUrl) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Assessment Request Submitted
          </CardTitle>
          <CardDescription>
            The PRISM questionnaire has been created for{' '}
            <strong>
              {form.getValues('forename')} {form.getValues('surname')}
            </strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Questionnaire link */}
          <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
            <p className="text-sm font-medium">Questionnaire Link</p>
            <p className="text-xs text-muted-foreground break-all">
              {questionnaireUrl}
            </p>
            <Button size="sm" asChild>
              <a href={questionnaireUrl} target="_blank" rel="noopener noreferrer">
                Open Questionnaire <ExternalLink className="ml-1 h-3.5 w-3.5" />
              </a>
            </Button>
          </div>

          {/* API Payload preview */}
          {showPayloadPreview && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  API Payload (sent to IG backend → PRISM)
                </p>
                <Button variant="ghost" size="sm" onClick={handleCopyPayload}>
                  {copied ? (
                    <CheckCircle2 className="mr-1 h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <ClipboardCopy className="mr-1 h-3.5 w-3.5" />
                  )}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
              <pre className="max-h-80 overflow-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-300">
                {JSON.stringify(submittedPayload, null, 2)}
              </pre>
            </div>
          )}

          <Button variant="outline" onClick={handleReset}>
            Submit Another Request
          </Button>
        </CardContent>
      </Card>
    )
  }

  // ── Form ──
  return (
    <Card>
      <CardHeader>
        <CardTitle>Request PRISM Assessment</CardTitle>
        <CardDescription>
          Register a user and request a PRISM Brain Mapping questionnaire.
          All fields map to the PRISM CreateCandidate API.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* ── Check existing customer ── */}
            <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">Already a PRISM customer?</p>
                  <p className="text-xs text-muted-foreground">
                    Check by email and questionnaire type — an existing customer
                    can still request a new report without recreating the account.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCheckCustomer}
                  disabled={disabled || checkCustomer.isPending}
                >
                  {checkCustomer.isPending ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="mr-1.5 h-4 w-4" />
                  )}
                  Check existing customer
                </Button>
              </div>

              {customerCheck && (
                <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center">
                  {customerCheck.exists ? (
                    <Badge
                      variant="secondary"
                      className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
                    >
                      <UserCheck className="h-3 w-3" />
                      Existing PRISM customer found
                    </Badge>
                  ) : (
                    <Badge variant="outline">
                      <UserPlus className="h-3 w-3" />
                      No existing record
                    </Badge>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {customerCheck.message ??
                      (customerCheck.exists
                        ? 'You can still request a new report — submit below to create another questionnaire for them.'
                        : 'A new customer will be created when you submit.')}
                  </p>
                  {customerCheck.exists && customerCheck.actionUrl && (
                    <Button size="sm" variant="ghost" asChild>
                      <a
                        href={customerCheck.actionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open in PRISM
                        <ExternalLink className="ml-1 h-3.5 w-3.5" />
                      </a>
                    </Button>
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* ── Section: User Details ── */}
            <div className="space-y-1">
              <h3 className="text-sm font-semibold">Candidate Details</h3>
              <p className="text-xs text-muted-foreground">
                Personal information for PRISM registration
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="forename"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Jane"
                        disabled={disabled}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="surname"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Smith"
                        disabled={disabled}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address *</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="jane.smith@company.com"
                      disabled={disabled}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    PRISM will send questionnaire access to this email
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={disabled}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>Required by PRISM API</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="organisation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organisation *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Acme Corp"
                        disabled={disabled}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* ── Section: Questionnaire Config ── */}
            <div className="space-y-1">
              <h3 className="text-sm font-semibold">Questionnaire Configuration</h3>
              <p className="text-xs text-muted-foreground">
                Select the type and language for the PRISM questionnaire
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="questionnaireTypeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Questionnaire Type *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value?.toString()}
                      disabled={disabled}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {QUEST_TYPE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.id} value={opt.id.toString()}>
                            {opt.label} ({opt.tier})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Foundation → Personal → Professional (upgradeable)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="languageId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Language</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value?.toString()}
                      disabled={disabled}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PRISM_LANGUAGES.map((lang) => (
                          <SelectItem key={lang.id} value={lang.id.toString()}>
                            {lang.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="reference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Internal Reference</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. EMP-2026-042, Q1-Review"
                      disabled={disabled}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Optional reference for tracking within your organisation
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            {/* ── Section: PRISM Options ── */}
            <div className="space-y-1">
              <h3 className="text-sm font-semibold">PRISM Options</h3>
              <p className="text-xs text-muted-foreground">
                Account creation and payment settings
              </p>
            </div>

            <div className="space-y-4">
              <FormField
                control={form.control}
                name="createUser"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm font-medium">
                        Create PRISM User Account
                      </FormLabel>
                      <FormDescription>
                        Creates a login on the PRISM platform for this
                        candidate. Only needed for first-time users.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={disabled}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isGift"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm font-medium">
                        Gift / Pre-paid
                      </FormLabel>
                      <FormDescription>
                        Auto-marks as paid — the report will be immediately
                        available without calling UnlockReport
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={disabled}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* ── Submit ── */}
            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={disabled}>
                Request Assessment
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => form.reset()}
                disabled={disabled}
              >
                Clear Form
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
