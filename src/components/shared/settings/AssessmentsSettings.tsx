/**
 * AssessmentsSettings — "Other Assessments" tab (G6).
 *
 * Users add prior reports manually. Each framework opens a small modal
 * with a framework-specific form, submits via `useCreateAssessment()`
 * with `raw_payload` shaped so the G4 adapters can parse it.
 *
 * - DISC      → raw_payload = { D, I, S, C }  (0–100 each)
 * - Big Five  → raw_payload = { O, C, E, A, N } (0–100 each)
 * - MBTI      → raw_payload = { type, clarity } (4-letter type + 0–100 clarity)
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Plus } from "lucide-react";

import { ReplacePrismDataButton } from "@/components/prism/ReplacePrismDataButton";
import { useCreateAssessment } from "@/hooks/profile/useProfile";
import type {
  AssessmentScore,
  AssessmentTyping,
  CreateAssessmentRequest,
} from "@/types/profile/profile-types";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

// Inputs come from `<Input type="number">` which RHF surfaces as strings. We
// validate that the string parses to a number in 0..100 and then convert
// in the submit handler — keeping form-state and schema-input types aligned
// avoids the `Resolver<unknown>` mismatch that bites when we let zod coerce
// at the schema layer.
const score100Str = z
  .string()
  .min(1, "Required")
  .refine((v) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 && n <= 100;
  }, "Must be 0–100");

const discSchema = z.object({
  D: score100Str,
  I: score100Str,
  S: score100Str,
  C: score100Str,
  assessed_at: z.string().min(1, "Required"),
});

const bigFiveSchema = z.object({
  O: score100Str,
  C: score100Str,
  E: score100Str,
  A: score100Str,
  N: score100Str,
  assessed_at: z.string().min(1, "Required"),
});

const mbtiSchema = z.object({
  type: z
    .string()
    .regex(/^[EI][SN][TF][JP]$/i, "Use a 4-letter type like INTJ"),
  clarity: score100Str,
  assessed_at: z.string().min(1, "Required"),
});

type DiscForm = z.infer<typeof discSchema>;
type BigFiveForm = z.infer<typeof bigFiveSchema>;
type MbtiForm = z.infer<typeof mbtiSchema>;

const toNum = (s: string): number => Number(s);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildScores(
  pairs: Record<string, number>,
): AssessmentScore[] {
  return Object.entries(pairs).map(([dimension, score]) => ({
    dimension,
    score,
  }));
}

// ---------------------------------------------------------------------------
// DISC dialog
// ---------------------------------------------------------------------------

function DiscDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const create = useCreateAssessment();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DiscForm>({
    resolver: zodResolver(discSchema),
    defaultValues: { D: "", I: "", S: "", C: "", assessed_at: isoToday() },
  });

  const onSubmit = async (values: DiscForm) => {
    const nums = {
      D: toNum(values.D),
      I: toNum(values.I),
      S: toNum(values.S),
      C: toNum(values.C),
    };
    const payload: CreateAssessmentRequest = {
      framework: "DISC",
      assessed_at: new Date(values.assessed_at).toISOString(),
      source: "user_input",
      raw_payload: nums,
      parsed_scores: buildScores(nums),
    };
    try {
      await create.mutateAsync(payload);
      toast.success("DISC result added.");
      reset({ D: "", I: "", S: "", C: "", assessed_at: isoToday() });
      onOpenChange(false);
    } catch (err) {
      toast.error((err as Error).message ?? "Failed to add DISC result.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="disc-dialog">
        <DialogHeader>
          <DialogTitle>Add DISC result</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          {(["D", "I", "S", "C"] as const).map((k) => (
            <div key={k} className="space-y-1">
              <Label htmlFor={`disc-${k}`}>{k} (0–100)</Label>
              <Input
                id={`disc-${k}`}
                type="number"
                min={0}
                max={100}
                step={1}
                {...register(k)}
              />
              {errors[k] && (
                <p className="text-xs text-destructive">{errors[k]?.message as string}</p>
              )}
            </div>
          ))}
          <div className="space-y-1">
            <Label htmlFor="disc-date">Assessed on</Label>
            <Input id="disc-date" type="date" {...register("assessed_at")} />
            {errors.assessed_at && (
              <p className="text-xs text-destructive">{errors.assessed_at.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || create.isPending}>
              {(isSubmitting || create.isPending) && (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              )}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Big Five dialog
// ---------------------------------------------------------------------------

function BigFiveDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const create = useCreateAssessment();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BigFiveForm>({
    resolver: zodResolver(bigFiveSchema),
    defaultValues: {
      O: "",
      C: "",
      E: "",
      A: "",
      N: "",
      assessed_at: isoToday(),
    },
  });

  const onSubmit = async (values: BigFiveForm) => {
    const nums = {
      O: toNum(values.O),
      C: toNum(values.C),
      E: toNum(values.E),
      A: toNum(values.A),
      N: toNum(values.N),
    };
    const payload: CreateAssessmentRequest = {
      framework: "BigFive",
      assessed_at: new Date(values.assessed_at).toISOString(),
      source: "user_input",
      raw_payload: nums,
      parsed_scores: buildScores(nums),
    };
    try {
      await create.mutateAsync(payload);
      toast.success("Big Five result added.");
      reset({ O: "", C: "", E: "", A: "", N: "", assessed_at: isoToday() });
      onOpenChange(false);
    } catch (err) {
      toast.error((err as Error).message ?? "Failed to add Big Five result.");
    }
  };

  const labels: Record<string, string> = {
    O: "Openness",
    C: "Conscientiousness",
    E: "Extraversion",
    A: "Agreeableness",
    N: "Neuroticism",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="bigfive-dialog">
        <DialogHeader>
          <DialogTitle>Add Big Five result</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          {(["O", "C", "E", "A", "N"] as const).map((k) => (
            <div key={k} className="space-y-1">
              <Label htmlFor={`bf-${k}`}>{labels[k]} (0–100)</Label>
              <Input
                id={`bf-${k}`}
                type="number"
                min={0}
                max={100}
                step={1}
                {...register(k)}
              />
              {errors[k] && (
                <p className="text-xs text-destructive">{errors[k]?.message as string}</p>
              )}
            </div>
          ))}
          <div className="space-y-1">
            <Label htmlFor="bf-date">Assessed on</Label>
            <Input id="bf-date" type="date" {...register("assessed_at")} />
            {errors.assessed_at && (
              <p className="text-xs text-destructive">{errors.assessed_at.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || create.isPending}>
              {(isSubmitting || create.isPending) && (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              )}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// MBTI dialog
// ---------------------------------------------------------------------------

function MbtiDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const create = useCreateAssessment();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MbtiForm>({
    resolver: zodResolver(mbtiSchema),
    defaultValues: { type: "", assessed_at: isoToday(), clarity: "50" },
  });

  const onSubmit = async (values: MbtiForm) => {
    const clarity = toNum(values.clarity);
    const typing: AssessmentTyping[] = [
      { type_code: values.type.toUpperCase(), clarity },
    ];
    const payload: CreateAssessmentRequest = {
      framework: "MBTI",
      assessed_at: new Date(values.assessed_at).toISOString(),
      source: "user_input",
      raw_payload: {
        type: values.type.toUpperCase(),
        clarity,
      },
      typing,
    };
    try {
      await create.mutateAsync(payload);
      toast.success("MBTI type added.");
      reset({ type: "", clarity: "50", assessed_at: isoToday() });
      onOpenChange(false);
    } catch (err) {
      toast.error((err as Error).message ?? "Failed to add MBTI type.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="mbti-dialog">
        <DialogHeader>
          <DialogTitle>Add MBTI type</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-1">
            <Label htmlFor="mbti-type">Type (e.g. INTJ)</Label>
            <Input
              id="mbti-type"
              type="text"
              placeholder="INTJ"
              maxLength={4}
              {...register("type")}
            />
            {errors.type && (
              <p className="text-xs text-destructive">{errors.type.message}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="mbti-clarity">Clarity (0–100)</Label>
            <Input
              id="mbti-clarity"
              type="number"
              min={0}
              max={100}
              {...register("clarity")}
            />
            {errors.clarity && (
              <p className="text-xs text-destructive">{errors.clarity.message as string}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="mbti-date">Assessed on</Label>
            <Input id="mbti-date" type="date" {...register("assessed_at")} />
            {errors.assessed_at && (
              <p className="text-xs text-destructive">{errors.assessed_at.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || create.isPending}>
              {(isSubmitting || create.isPending) && (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              )}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Top-level "Other Assessments" card
// ---------------------------------------------------------------------------

export default function AssessmentsSettings() {
  const [discOpen, setDiscOpen] = useState(false);
  const [bfOpen, setBfOpen] = useState(false);
  const [mbtiOpen, setMbtiOpen] = useState(false);

  return (
    <Card className="shadow-sm" data-testid="assessments-settings">
      <CardHeader className="text-left">
        <CardTitle className="text-lg font-semibold">Other Assessments</CardTitle>
        <p className="text-sm text-muted-foreground">
          Add prior assessment results so Meridian can take them into account.
          Use these for reports you already have on hand.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 text-left">
        <div
          className="flex flex-col gap-2 rounded-md border border-border/60 p-3 sm:flex-row sm:items-center sm:justify-between"
          data-testid="prism-data-settings"
        >
          <div>
            <p className="text-sm font-medium">Your PRISM data</p>
            <p className="text-xs text-muted-foreground">
              Replace your PRISM scores from a raw-data CSV, and optionally your
              report PDF. This overwrites your current PRISM profile.
            </p>
          </div>
          <ReplacePrismDataButton label="Replace PRISM data" variant="outline" size="sm" />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setDiscOpen(true)}
          >
            <Plus className="mr-1.5 h-4 w-4" /> Add DISC result
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setBfOpen(true)}
          >
            <Plus className="mr-1.5 h-4 w-4" /> Add Big Five result
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setMbtiOpen(true)}
          >
            <Plus className="mr-1.5 h-4 w-4" /> Add MBTI type
          </Button>
        </div>
      </CardContent>

      <DiscDialog open={discOpen} onOpenChange={setDiscOpen} />
      <BigFiveDialog open={bfOpen} onOpenChange={setBfOpen} />
      <MbtiDialog open={mbtiOpen} onOpenChange={setMbtiOpen} />
    </Card>
  );
}
