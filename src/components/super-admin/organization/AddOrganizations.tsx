import { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { OnboardingOrganizationModel } from "@/components/super-admin/organization/OnboardingOrganizationModel";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";

import OrganizationInfoStep from "@/components/super-admin/organization/onboarding-steps/OrganizationInfo";
import CoachesInfoStep from "@/components/super-admin/organization/onboarding-steps/CoachesInfo";
import LicenseInfoStep from "@/components/super-admin/organization/onboarding-steps/LicenseInfo";

import type { OrganizationFormData } from "@/types/super-admin/organization/form-types";
import type { AssignCoachRequest } from "@/services/super-admin/organization-management/organization-management.service";
import { toast } from "sonner";
import {
  useCreateOrganization,
  useAssignCoachesToOrganization,
  useAssignCoachesToBusiness,
  useCreateLicense,
  useOrganizationAgents,
} from "@/hooks/super-admin/organization-management/useOrganizationManagement";
import {
  ORGANIZATION_FORM_DEFAULTS,
  ORGANIZATION_STEPS,
} from "@/components/shared/forms/organizationForm.constants";

interface AddOrganizationProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  mode?: "add" | "edit";
  initialData?: Partial<OrganizationFormData>;
  onSubmit?: (data: OrganizationFormData) => void;
  flowType?: "full" | "organization-only" | "coaches-only";
  organizationId?: string;
  selectedBusinessId?: string;
  isOrganizationLevel?: boolean;
}

export default function AddOrganization({
  open,
  onOpenChange,
  mode = "add",
  initialData,
  onSubmit: onSubmitProp,
  flowType = "full",
  organizationId: propOrganizationId,
  selectedBusinessId,
  isOrganizationLevel = false,
}: AddOrganizationProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [organizationId, setOrganizationId] = useState<string>("");

  const form = useForm<OrganizationFormData>({
    defaultValues: ORGANIZATION_FORM_DEFAULTS,
    mode: "onTouched",
  });

  // Mutations
  const createOrgMutation = useCreateOrganization();
  const assignCoachesOrgMutation = useAssignCoachesToOrganization();
  const assignCoachesBusinessMutation = useAssignCoachesToBusiness();
  const createLicenseMutation = useCreateLicense();

  // Fetch existing organization coaches
  const { data: orgAgentsRes } = useOrganizationAgents(
    propOrganizationId,
    isOrganizationLevel ? undefined : selectedBusinessId
  );

  // Get already assigned coaches
  const assignedCoachIds = useMemo(() => {
    if (!orgAgentsRes?.data?.agents) return [];
    return orgAgentsRes.data.agents.map((agent) => agent.agent_id);
  }, [orgAgentsRes?.data?.agents]);

  const visibleSteps = useMemo(() => {
    const stepMap = {
      "organization-only": [ORGANIZATION_STEPS[0], ORGANIZATION_STEPS[2]],
      "coaches-only": [ORGANIZATION_STEPS[1]],
      full: ORGANIZATION_STEPS,
    };
    return stepMap[flowType];
  }, [flowType]);

  useEffect(() => {
    if (open) {
      form.reset({ ...ORGANIZATION_FORM_DEFAULTS, ...initialData });
      setCurrentStep(0);
      setOrganizationId(propOrganizationId ?? "");
    }
  }, [open, initialData, form, propOrganizationId]);

  const handleClose = () => {
    onOpenChange?.(false);
    setCurrentStep(0);
    setOrganizationId("");
    form.reset(ORGANIZATION_FORM_DEFAULTS);
  };

  const getStepFields = (stepIndex: number): (keyof OrganizationFormData)[] => {
    const stepLabel = visibleSteps[stepIndex]?.label || "";
    const fieldMap: Record<string, (keyof OrganizationFormData)[]> = {
      Organization: ["organization_name", "email", "contact", "address", "logo"],
      Coaches: ["coaches"],
      License: ["license_type", "license_start_date", "license_end_date"],
    };
    
    for (const [key, fields] of Object.entries(fieldMap)) {
      if (stepLabel.includes(key)) return fields;
    }
    return [];
  };

  const handleNext = async () => {
    const fields = getStepFields(currentStep);
    if (!(await form.trigger(fields))) return;

    setIsSubmitting(true);
    try {
      const stepLabel = visibleSteps[currentStep]?.label || "";
      const isLastStep = currentStep === visibleSteps.length - 1;
      const values = form.getValues();
      const finalOrgId = organizationId || propOrganizationId!;

      if (stepLabel.includes("Organization")) {
        await handleOrganizationStep(values, isLastStep);
      } else if (stepLabel.includes("Coaches")) {
        await handleCoachesStep(values, finalOrgId, isLastStep);
      } else if (stepLabel.includes("License")) {
        await handleLicenseStep(values, isLastStep);
      }
    } catch (error) {
      console.error("Step error:", error);
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOrganizationStep = async (values: OrganizationFormData, isLastStep: boolean) => {
    const formData = new FormData();
    Object.entries({
      name: values.organization_name,
      type: values.type,
      contact: values.contact,
      email: values.email,
      address: values.address,
      website_url: values.website_url,
    }).forEach(([key, value]) => formData.append(key, value));
    
    if (values.logo) formData.append("logo", values.logo);

    const result = await createOrgMutation.mutateAsync(formData);
    if (result.status && result.data?.organization_id) {
      toast.success(result.message || "Organization created successfully");
      setOrganizationId(result.data.organization_id);
      onSubmitProp?.(form.getValues());
      isLastStep ? handleClose() : setCurrentStep((prev) => prev + 1);
    }
  };

  const handleCoachesStep = async (values: OrganizationFormData, finalOrgId: string, isLastStep: boolean) => {
    if (!finalOrgId) throw new Error("Organization ID missing.");

    if (values.coaches?.length > 0) {
      if (isOrganizationLevel) {
        const payload: AssignCoachRequest = {
          preferences: values.coaches.map((coach) => ({
            agent_id: coach.agentId,
            tone_ids: coach.toneIds || [],
            accent_id: coach.accentId || "",
            gender_id: coach.genderId || "",
          })),
        };
        await assignCoachesOrgMutation.mutateAsync({ orgId: finalOrgId, payload });
        toast.success("Coaches assigned to organization successfully");
      } else if (selectedBusinessId) {
        await assignCoachesBusinessMutation.mutateAsync({
          orgId: finalOrgId,
          businessId: selectedBusinessId,
          payload: { agent_ids: values.coaches.map((c) => c.agentId) },
        });
        toast.success("Coaches assigned to business successfully");
      } else {
        throw new Error("Business ID missing for business-level assignment");
      }
    }

    (isLastStep || flowType === "coaches-only") ? handleClose() : setCurrentStep((prev) => prev + 1);
  };

  const handleLicenseStep = async (values: OrganizationFormData, isLastStep: boolean) => {
    if (!organizationId) throw new Error("Organization ID missing.");

    await createLicenseMutation.mutateAsync({
      organization_id: organizationId,
      subscription_tier: values.license_type,
      start_date: values.license_start_date || new Date().toISOString(),
      end_date: values.license_end_date || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    });
    toast.success("License created successfully");

    (flowType === "organization-only" || isLastStep) ? handleClose() : setCurrentStep((prev) => prev + 1);
  };

  const renderStepContent = () => {
    const stepLabel = visibleSteps[currentStep]?.label || "";
    if (stepLabel.includes("Organization")) return <OrganizationInfoStep form={form} />;
    if (stepLabel.includes("Coaches")) return (
      <CoachesInfoStep
        form={form}
        isAddCoachOpen={false}
        setIsAddCoachOpen={() => {}}
        isOrganizationLevel={isOrganizationLevel}
        assignedCoachIds={assignedCoachIds}
      />
    );
    if (stepLabel.includes("License")) return <LicenseInfoStep form={form} />;
    return null;
  };

  const getModalTitle = () => {
    if (flowType === "coaches-only") {
      return isOrganizationLevel ? "Assign Coaches to Organization" : "Assign Coaches to Business";
    }
    return mode === "edit" ? "Edit Organization" : "Add Organization";
  };

  const isLastStep = currentStep === visibleSteps.length - 1;

  return (
    <OnboardingOrganizationModel
      open={open ?? false}
      onOpenChange={onOpenChange ?? (() => {})}
      title={getModalTitle()}
      steps={visibleSteps}
      currentStep={currentStep}
      showProgress={visibleSteps.length > 1}
      onClose={handleClose}
      footer={
        <>
          <Button onClick={handleClose} variant="outline" disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleNext} disabled={isSubmitting}>
            {isSubmitting ? "Processing..." : isLastStep ? "Submit" : "Save & Next"}
          </Button>
        </>
      }
    >
      <Form {...form}>{renderStepContent()}</Form>
    </OnboardingOrganizationModel>
  );
}