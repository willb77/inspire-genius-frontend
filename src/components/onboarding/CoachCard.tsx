import { Button } from "@/components/ui/button";
import { CircleQuestionMark, Volume2, SquarePen, Loader2, Pause } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import MultiSelect from "@/components/ui/multi-select";
import { Skeleton } from "@/components/ui/skeleton";
import type { CoachCardProps } from "@/types/onboarding";
import { useForm } from "react-hook-form";
import { useUpdatePreferences } from "@/hooks/coaches/useUpdatePreferences";
import { useCoachAudioPreview } from "@/hooks/useCoachAudioPreview";
import { useQueryClient } from "@tanstack/react-query";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

type FormValues = {
  genderId?: string;
  accentId?: string;
  toneIds: string[];
};

export default function CoachCard({
  title,
  agentId,
  genders,
  accents,
  tones,
  selectedGenderId,
  selectedAccentId,
  selectedToneIds,
  extraCount = 0,
  onSaved,
  onSubmit: onSubmitProp,
  isSubmitting,
  disableButton = false,
  activeAgentId,
  setActiveAgentId,
  activeAgentPhase,
  setActiveAgentPhase,
}: CoachCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const queryClient = useQueryClient();
  const {
    setValue,
    handleSubmit,
    reset,
    watch,
    formState: { isDirty },
  } = useForm<FormValues>({
    defaultValues: {
      genderId: selectedGenderId ?? undefined,
      accentId: selectedAccentId ?? undefined,
      toneIds: selectedToneIds ?? [],
    },
  });

  useEffect(() => {
    reset({
      genderId: selectedGenderId ?? undefined,
      accentId: selectedAccentId ?? undefined,
      toneIds: selectedToneIds ?? [],
    });
  }, [reset, selectedGenderId, selectedAccentId, selectedToneIds]);

  const g = watch("genderId");
  const a = watch("accentId");
  const t = watch("toneIds");

  const genderLabel = useMemo(() => genders.find((x) => x.value === (selectedGenderId ?? g))?.label ?? "—", [genders, selectedGenderId, g]);
  const accentLabel = useMemo(() => accents.find((x) => x.value === (selectedAccentId ?? a))?.label ?? "—", [accents, selectedAccentId, a]);
  const toneLabels = useMemo(() => {
    const ids = (selectedToneIds ?? t) ?? [];
    return ids.map((id) => tones.find((x) => x.value === id)?.label).filter(Boolean) as string[];
  }, [tones, selectedToneIds, t]);

  const updateMutation = useUpdatePreferences();
  const { phase, playFresh, pause, resume } = useCoachAudioPreview();
  const submitting = onSubmitProp ? !!isSubmitting : updateMutation.isPending;
  const onSubmit = async (values: FormValues) => {
    if (onSubmitProp) {
      await onSubmitProp(values);
      setIsEditing(false);
      onSaved?.();
      return;
    }
    const body = {
      tone_ids: values.toneIds ?? [],
      accent_id: values.accentId ?? "",
      gender_id: values.genderId ?? "",
    };
    updateMutation.mutate({ agentId, body }, {
      onSuccess: async () => {
        await queryClient.invalidateQueries({ predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === 'agents' });
        setIsEditing(false);
        onSaved?.();
      },
    });
  };

  useEffect(() => {
    // If this card is the active one, sync its phase up to parent
    if (activeAgentId === agentId && setActiveAgentPhase) {
      setActiveAgentPhase(phase);
    }
    // When active card goes idle, clear active id
    if (phase === 'idle' && activeAgentId === agentId && setActiveAgentId) {
      setActiveAgentId(null);
    }
  }, [phase, activeAgentId, agentId, setActiveAgentId, setActiveAgentPhase]);

  return (
    <div className="bg-white rounded-2xl shadow-[4px_4px_20px_4px_rgba(0,0,0,0.1)] p-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground rounded-full p-1"
          aria-label="Help"
        >
          <CircleQuestionMark className="h-4 w-4" />
        </button>
      </div>

      {/* Fields */}
      <div className="mt-4 space-y-3 text-sm">
        <div>
          <div className="text-muted-foreground mb-1">Gender</div>
          {isEditing ? (
            submitting ? (
              <Skeleton className="h-10 w-full rounded-xl" />
            ) : (
            <Select value={g} onValueChange={(v) => setValue("genderId", v, { shouldDirty: true })}>
              <SelectTrigger className="h-11 w-full rounded-xl bg-gray-100 border border-gray-10">
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                {genders.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            )
          ) : (
            <div className="bg-gray-100 text-foreground rounded-xl px-3 py-2 font-medium">{genderLabel}</div>
          )}
        </div>
        <div>
          <div className="text-muted-foreground mb-1">Voice Accent</div>
          {isEditing ? (
            submitting ? (
              <Skeleton className="h-10 w-full rounded-xl" />
            ) : (
            <Select value={a} onValueChange={(v) => setValue("accentId", v, { shouldDirty: true })}>
              <SelectTrigger className="h-11 w-full rounded-xl bg-gray-100 border border-gray-10">
                <SelectValue placeholder="Select accent" />
              </SelectTrigger>
              <SelectContent>
                {accents.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            )
          ) : (
            <div className="bg-gray-100 text-foreground rounded-xl px-3 py-2 font-medium">{accentLabel}</div>
          )}
        </div>
        <div>
          <div className="text-muted-foreground mb-1">Voice Tone</div>
          {isEditing ? (
            submitting ? (
              <Skeleton className="h-10 w-full rounded-xl" />
            ) : (
              <MultiSelect
                value={t}
                onChange={(vals) => setValue("toneIds", vals, { shouldDirty: true })}
                options={tones}
                placeholder="Select tones"
                className="rounded-xl"
                maxVisible={2}
              />
            )
          ) : (
            <div className="bg-gray-100 text-foreground rounded-xl px-3 py-2 font-medium flex items-center gap-2">
              <span className="flex-1">{toneLabels?.length > 0 ? toneLabels.slice(0, 2).join(", ") : "—"}</span>
              {extraCount > 0 ? (
                <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg font-medium">
                  {extraCount}+
                </span>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex items-center gap-3">
        {(isEditing || isDirty) ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-11 w-11 rounded-xl border border-blue-primary"
                    disabled
                  >
                    {phase === 'starting' ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : phase === 'speaking' ? (
                      <Pause className="h-5 w-5" />
                    ) : (
                      <Volume2 className="h-5 w-5" />
                    )}
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <span className="text-xs">if any changes are made, Save and play</span>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <Button
            variant="outline"
            size="icon"
            className="h-11 w-11 rounded-xl border border-blue-primary"
            disabled={(phase === 'starting') || (!!activeAgentId && activeAgentId !== agentId && activeAgentPhase !== 'paused')}
            onClick={() => {
              const params = {
                genderId: (isEditing ? g : (selectedGenderId ?? g)) ?? undefined,
                accentId: (isEditing ? a : (selectedAccentId ?? a)) ?? undefined,
                toneIds: (isEditing ? t : (selectedToneIds ?? t)) ?? [],
              };
              if (phase === 'speaking') { pause(); return; }
              if (phase === 'paused') { resume(); return; }
              playFresh(params);
              if (setActiveAgentId) setActiveAgentId(agentId);
              if (setActiveAgentPhase) setActiveAgentPhase('starting');
            }}
          >
            {phase === 'starting' ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : phase === 'speaking' ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Volume2 className="h-5 w-5" />
            )}
          </Button>
        )}
        {isEditing ? (
          <form className="flex-1 flex gap-3" onSubmit={handleSubmit(onSubmit)}>
            <Button
              type="button"
              variant="outline"
              className="h-11 flex-1 rounded-xl"
              onClick={() => {
                reset({
                  genderId: selectedGenderId ?? undefined,
                  accentId: selectedAccentId ?? undefined,
                  toneIds: selectedToneIds ?? [],
                });
                setIsEditing(false);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="h-11 flex-1 rounded-xl"
              disabled={submitting || !isDirty}
            >
              {submitting ? (
                <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Saving...</span>
              ) : (
                'Save'
              )}
            </Button>
          </form>
        ) : (
          <Button
            variant="secondary"
            disabled={disableButton}
            className="h-11 flex-1 rounded-xl bg-blue-10 hover:bg-blue-100 text-blue-primary"
            onClick={() => setIsEditing(true)}
          >
            Edit
            <SquarePen className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
