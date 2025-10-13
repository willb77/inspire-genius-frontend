import {
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useForm } from "react-hook-form";
import { Upload, X } from "lucide-react";
import { CustomModal } from "@/components/super-admin/organization/OnboardingOrganizationModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import type { SimpleKind } from "@/types/documents";

// ==================== TYPES ====================
interface AddOrganizationProps {
  trigger: ReactNode;
  onSubmit?: (data: OrganizationFormData) => void | Promise<void>;
}

interface OrganizationFormData {
  organization_name: string;
  type: string;
  website_url: string;
  address: string;
  files: File[];
  // Admin Info
  admin_name: string;
  admin_email: string;
  admin_phone: string;
  // Coach Info
  coach_name: string;
  coach_email: string;
  // License Info
  license_key: string;
  license_type: string;
}

// ==================== CONSTANTS ====================
const STEPS = [
  { label: "Organization Info" },
  { label: "Admin Info" },
  { label: "Coaches Info" },
  { label: "License Info" },
];

const ORGANIZATION_TYPES = [
  "Business",
  "Personal",
  "Education",
  "Healthcare",
] as const;

const LICENSE_TYPES = ["Standard", "Premium", "Enterprise"] as const;

const ACCEPTED_FILE_TYPES = ".pdf,.csv,.ppt,.pptx,.doc,.docx";

const DEFAULT_FORM_VALUES: OrganizationFormData = {
  organization_name: "",
  type: "",
  website_url: "",
  address: "",
  files: [],
  admin_name: "",
  admin_email: "",
  admin_phone: "",
  coach_name: "",
  coach_email: "",
  license_key: "",
  license_type: "",
};

// ==================== UTILITY FUNCTIONS ====================
function getFileKind(name: string): SimpleKind {
  const lowercaseName = name.toLowerCase();
  if (lowercaseName.endsWith(".pdf")) return "pdf";
  if (lowercaseName.endsWith(".csv")) return "csv";
  if (lowercaseName.endsWith(".ppt") || lowercaseName.endsWith(".pptx"))
    return "ppt";
  return "doc";
}

// ==================== MAIN COMPONENT ====================
export default function AddOrganization({
  trigger,
  onSubmit,
}: AddOrganizationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const form = useForm<OrganizationFormData>({
    defaultValues: DEFAULT_FORM_VALUES,
    mode: "onTouched",
  });

  const { watch, setValue, getValues } = form;

  // ==================== FILE HANDLERS ====================
  const handleFileSelect = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const addFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList?.length) return;

      const currentFiles = getValues("files");
      setValue("files", [...currentFiles, ...Array.from(fileList)]);
    },
    [getValues, setValue]
  );

  const removeFile = useCallback(
    (index: number) => {
      const currentFiles = getValues("files");
      setValue(
        "files",
        currentFiles.filter((_, i) => i !== index)
      );
    },
    [getValues, setValue]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  // ==================== VALIDATION ====================
  const validateCurrentStep = useCallback(async () => {
    const fields = getStepFields(currentStep);
    const isValid = await form.trigger(fields);
    return isValid;
  }, [currentStep, form]);

  const getStepFields = useCallback(
    (step: number): (keyof OrganizationFormData)[] => {
      switch (step) {
        case 0:
          return ["organization_name", "type"];
        case 1:
          return ["admin_name", "admin_email"];
        case 2:
          return ["coach_name", "coach_email"];
        case 3:
          return ["license_key", "license_type"];
        default:
          return [];
      }
    },
    []
  );

  // ==================== NAVIGATION ====================
  const handleNext = useCallback(async () => {
    const isStepValid = await validateCurrentStep();
    if (!isStepValid) return;

    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      // Final submission
      setIsSubmitting(true);
      try {
        const formData = getValues();
        await onSubmit?.(formData);
        handleClose();
      } catch (error) {
        console.error("Submission error:", error);
      } finally {
        setIsSubmitting(false);
      }
    }
  }, [currentStep, validateCurrentStep, getValues, onSubmit]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setCurrentStep(0);
    form.reset(DEFAULT_FORM_VALUES);
    setDragOver(false);
  }, [form]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(0);
      setDragOver(false);
      form.reset(DEFAULT_FORM_VALUES);
    }
  }, [isOpen, form]);

  // ==================== RENDER HELPERS ====================
  const renderFileUploadZone = () => {
    const files = watch("files");
    return (
      <div className="space-y-2">
        <FormLabel className="text-sm font-medium">
          Add Logo / Documents
        </FormLabel>
        <div
          className={`rounded-xl border-2 border-dashed transition-colors ${
            dragOver ? "border-blue-400 bg-blue-50/40" : "border-gray-300"
          } p-6`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center justify-center text-center gap-3">
            <Upload className="w-8 h-8 text-blue-500" />
            <div className="text-sm text-gray-600">
              Drag & drop your files here
            </div>
            <div className="text-xs text-gray-500">OR</div>
            <Button type="button" size="sm" onClick={handleFileSelect}>
              Browse files
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => addFiles(e.target.files)}
              accept={ACCEPTED_FILE_TYPES}
            />
          </div>
        </div>

        {/* File Queue */}
        {files.length > 0 && (
          <div className="mt-4 space-y-2 max-h-[40vh] overflow-y-auto pr-1">
            {files.map((file, idx) => (
              <div
                key={`${file.name}-${idx}`}
                className="flex items-center gap-3 rounded-lg border px-3 py-2"
              >
                <span className="inline-flex items-center justify-center w-8 h-6 rounded text-xs font-semibold bg-blue-50 text-blue-600">
                  {getFileKind(file.name).toUpperCase()}
                </span>
                <div className="flex-1 text-sm truncate">{file.name}</div>
                <div className="text-xs text-gray-500">
                  {(file.size / 1024).toFixed(1)} KB
                </div>
                <button
                  type="button"
                  className="text-gray-400 hover:text-gray-600"
                  onClick={() => removeFile(idx)}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Organization Info
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              <FormField
                control={form.control}
                name="organization_name"
                rules={{ required: "Organization name is required" }}
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="mb-2 block text-xs">
                      Organization Name *
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Enter Organization Name" {...field} />
                    </FormControl>
                    <div className="min-h-[20px]">
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                rules={{ required: "Organization type is required" }}
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="mb-2 block text-xs">Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Organization type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ORGANIZATION_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="min-h-[20px]">
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="website_url"
                rules={{
                  validate: (value) => {
                    if (!value) return true; // Optional field
                    try {
                      new URL(value);
                      return true;
                    } catch {
                      return "Please enter a valid URL";
                    }
                  },
                }}
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="mb-2 block text-xs">
                      Website URL
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        placeholder="https://example.com"
                        {...field}
                      />
                    </FormControl>
                    <div className="min-h-[20px]">
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="mb-2 block text-xs">
                      Address
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Enter Address" {...field} />
                    </FormControl>
                    <div className="min-h-[20px]">
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
            </div>

            {renderFileUploadZone()}
          </div>
        );

      case 1: // Admin Info
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              <FormField
                control={form.control}
                name="admin_name"
                rules={{ required: "Admin name is required" }}
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="mb-2 block text-xs">
                      Admin Name *
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Enter Admin Name" {...field} />
                    </FormControl>
                    <div className="min-h-[20px]">
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="admin_email"
                rules={{
                  required: "Admin email is required",
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: "Please enter a valid email address",
                  },
                }}
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="mb-2 block text-xs">
                      Admin Email *
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="admin@example.com"
                        {...field}
                      />
                    </FormControl>
                    <div className="min-h-[20px]">
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="admin_phone"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="mb-2 block text-xs text-left">
                    Phone Number (Optional)
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      {...field}
                    />
                  </FormControl>
                  <div className="min-h-[20px]">
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
          </div>
        );

      case 2: // Coach Info
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              <FormField
                control={form.control}
                name="coach_name"
                rules={{ required: "Coach name is required" }}
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="mb-2 block text-xs">
                      Coach Name *
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Enter Coach Name" {...field} />
                    </FormControl>
                    <div className="min-h-[20px]">
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="coach_email"
                rules={{
                  required: "Coach email is required",
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: "Please enter a valid email address",
                  },
                }}
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="mb-2 block text-xs">
                      Coach Email *
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="coach@example.com"
                        {...field}
                      />
                    </FormControl>
                    <div className="min-h-[20px]">
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
            </div>
          </div>
        );

      case 3: // License Info
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              <FormField
                control={form.control}
                name="license_key"
                rules={{ required: "License key is required" }}
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="mb-2 block text-xs">
                      License Key *
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="XXXX-XXXX-XXXX-XXXX" {...field} />
                    </FormControl>
                    <div className="min-h-[20px]">
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="license_type"
                rules={{ required: "License type is required" }}
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="mb-2 block text-xs">
                      License Type *
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select License Type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {LICENSE_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="min-h-[20px]">
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // ==================== RENDER ====================
  return (
    <>
      <div
        onClick={() => setIsOpen(true)}
        className="inline-block cursor-pointer"
      >
        {trigger}
      </div>

      <CustomModal
        open={isOpen}
        onOpenChange={setIsOpen}
        title="Add Organization"
        steps={STEPS}
        currentStep={currentStep}
        description={`Step ${currentStep + 1} of ${STEPS.length}: ${
          STEPS[currentStep].label
        }`}
        showProgress={true}
        onClose={handleClose}
        footer={
          <>
            {currentStep > 0 && (
              <Button
                onClick={handleBack}
                variant="outline"
                disabled={isSubmitting}
              >
                Back
              </Button>
            )}
            <Button
              onClick={handleClose}
              variant="outline"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleNext} disabled={isSubmitting}>
              {isSubmitting
                ? "Submitting..."
                : currentStep === STEPS.length - 1
                ? "Submit"
                : "Save & Next"}
            </Button>
          </>
        }
      >
        <Form {...form}>{renderStepContent()}</Form>
      </CustomModal>
    </>
  );
}
