import { useCallback, useState, useMemo } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormLabel } from "@/components/ui/form";
import type { UseFormReturn } from "react-hook-form";
import type { OrganizationFormData, CoachInfo } from "@/types/super-admin/organization";
import { useTones } from "@/hooks/coaches/useTones";
import { useAccents } from "@/hooks/coaches/useAccents";
import { useGenders } from "@/hooks/coaches/useGenders";
import { useAgents } from "@/hooks/coaches/useAgents";
import MultiSelect from "@/components/ui/multi-select";

type Option = { id: string; name: string };

type Props = {
  form: UseFormReturn<OrganizationFormData>;
  isAddCoachOpen: boolean;
  setIsAddCoachOpen: (v: boolean) => void;
  isOrganizationLevel?: boolean;
  assignedCoachIds?: string[];
};

const extractOptions = (data: any, paths: string[][]): Option[] => {
  if (!data) return [];
  
  for (const path of paths) {
    let current = data;
    for (const key of path) {
      current = current?.[key];
      if (!current) break;
    }
    if (Array.isArray(current)) return current;
  }
  
  return [];
};

export default function CoachesInfoStep({
  form,
  isAddCoachOpen,
  setIsAddCoachOpen,
  isOrganizationLevel = false,
  assignedCoachIds = [],
}: Props) {
  const { watch, setValue } = form;
  const coaches = watch("coaches") || [];
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");

  const commonQueryConfig = { enabled: isOrganizationLevel } as any;

  const { data: tonesResp } = useTones<any>(commonQueryConfig);
  const { data: accentsResp } = useAccents<any>(commonQueryConfig);
  const { data: gendersResp } = useGenders<any>(commonQueryConfig);
  const { data: agentsResp } = useAgents({ page: 1, page_size: 50 }, { ...commonQueryConfig });

  const toneOptions = useMemo(() => 
    isOrganizationLevel ? extractOptions(tonesResp, [['data', 'Tones'], ['data']]) : [],
    [isOrganizationLevel, tonesResp]
  );

  const accentOptions = useMemo(() => 
    isOrganizationLevel ? extractOptions(accentsResp, [['data', 'Accents'], ['data', 'Tones'], ['data']]) : [],
    [isOrganizationLevel, accentsResp]
  );

  const genderOptions = useMemo(() => 
    isOrganizationLevel ? extractOptions(gendersResp, [['data', 'Genders'], ['data']]) : [],
    [isOrganizationLevel, gendersResp]
  );

  const agentsList: Array<{ id: string; name: string }> = useMemo(() => {
    const agents = (agentsResp as any)?.data?.agents;
    return Array.isArray(agents) ? agents : [];
  }, [agentsResp]);

  // Filter out coaches that are:
  // 1. Already added in the current form
  // 2. Already assigned to the organization/business (from assignedCoachIds)
  const availableAgents = useMemo(() => {
    const currentlyAddedIds = coaches.map((c) => c.agentId);
    const excludedIds = new Set([...currentlyAddedIds, ...assignedCoachIds]);
    return agentsList.filter((a) => !excludedIds.has(a.id));
  }, [agentsList, coaches, assignedCoachIds]);

  const addCoach = useCallback(() => {
    if (!selectedAgentId) return;

    const newCoach: CoachInfo = {
      id: Date.now().toString(),
      agentId: selectedAgentId,
      toneIds: [],
      accentId: "",
      genderId: "",
    };

    setValue("coaches", [...coaches, newCoach]);
    setSelectedAgentId("");
    setIsAddCoachOpen(false);
  }, [coaches, setValue, setIsAddCoachOpen, selectedAgentId]);

  const deleteCoach = useCallback(
    (coachId: string) => setValue("coaches", coaches.filter((c: CoachInfo) => c.id !== coachId)),
    [coaches, setValue]
  );

  const updateCoach = useCallback(
    (coachId: string, field: keyof CoachInfo, value: string | string[]) => {
      setValue("coaches", coaches.map((c: CoachInfo) => (c.id === coachId ? { ...c, [field]: value } : c)));
    },
    [coaches, setValue]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col">
        <FormLabel className="text-sm font-medium text-gray-900 mb-2">
          {isOrganizationLevel ? "Assign Coaches to Organization" : "Assign Organization Coaches to Business"}
        </FormLabel>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
            <SelectTrigger className="w-full sm:w-[300px]">
              <SelectValue placeholder="Select Coach" />
            </SelectTrigger>
            <SelectContent>
              {availableAgents.length === 0 ? (
                <p className="text-gray-500 text-center py-2">
                  {isOrganizationLevel ? "All agents added" : "No available coaches"}
                </p>
              ) : (
                availableAgents.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>

          <Button
            type="button"
            onClick={addCoach}
            disabled={isAddCoachOpen || !selectedAgentId}
            className="w-full sm:w-auto"
          >
            Add Coach
          </Button>
        </div>
      </div>

      <div className="space-y-4 bg-white rounded-lg p-3 border border-gray-200">
        {coaches.length === 0 ? (
          <p className="text-sm text-gray-500 text-center">No coaches added yet.</p>
        ) : (
          coaches.map((coach: CoachInfo) => (
            <div key={coach.id} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Input
                value={agentsList.find((a) => a.id === coach.agentId)?.name || ""}
                readOnly
                placeholder="Selected coach"
                className="flex-1 py-5"
              />

              {isOrganizationLevel && (
                <>
                  <MultiSelect
                    value={coach.toneIds || []}
                    onChange={(vals) => updateCoach(coach.id, "toneIds", vals)}
                    options={toneOptions.map((t) => ({ label: t.name, value: t.id }))}
                    placeholder="Select tones"
                    className="rounded-md bg-transparent flex-1"
                    maxVisible={1}
                  />

                  <Select value={coach.genderId || ""} onValueChange={(v) => updateCoach(coach.id, "genderId", v)}>
                    <SelectTrigger className="w-full sm:w-auto flex-1 py-5">
                      <SelectValue placeholder="Gender" />
                    </SelectTrigger>
                    <SelectContent>
                      {genderOptions.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={coach.accentId || ""} onValueChange={(v) => updateCoach(coach.id, "accentId", v)}>
                    <SelectTrigger className="w-full sm:w-auto flex-1 py-5">
                      <SelectValue placeholder="Accent" />
                    </SelectTrigger>
                    <SelectContent>
                      {accentOptions.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}

              <Button
                type="button"
                variant="ghost"
                onClick={() => deleteCoach(coach.id)}
                className="self-end sm:self-center text-gray-400 hover:text-red-600 p-1"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}