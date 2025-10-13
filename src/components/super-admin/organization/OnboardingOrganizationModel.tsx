import React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Step {
  label: string;
}

interface CustomModalProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  steps?: Step[];
  currentStep?: number;
  showProgress?: boolean;
  description?: string;
  children: React.ReactNode;
  footer: React.ReactNode;
  onClose: () => void;
}

export const CustomModal: React.FC<CustomModalProps> = ({
  open,
  onOpenChange,
  title,
  steps,
  currentStep = 0,
  showProgress = false,
  description,
  children,
  footer,
  onClose,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => onOpenChange?.(false)}
      />

      {/* Dialog Content */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[calc(100%-2rem)] sm:max-w-2xl bg-white rounded-lg shadow-lg p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-left">{title}</h2>
            {description && (
              <p className="text-sm text-gray-500 mt-1">{description}</p>
            )}
          </div>

          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              onClose?.();
              onOpenChange?.(false);
            }}
            className="rounded-full hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </Button>
        </div>

        {/* Progress Steps */}
        {showProgress && steps && steps.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              {steps.map((step, index) => (
                <React.Fragment key={index}>
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${
                        index < currentStep
                          ? "bg-gray-700 text-white"
                          : index === currentStep
                          ? "bg-gray-700 text-white"
                          : "bg-gray-200 text-gray-500"
                      }`}
                    >
                      {index < currentStep ? "✓" : index + 1}
                    </div>
                    <span className="text-xs mt-2 text-center">
                      {step.label}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`h-0.5 flex-1 mx-2 mt-[-20px] ${
                        index < currentStep ? "bg-gray-700" : "bg-gray-200"
                      }`}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="mb-6">{children}</div>

        {/* Footer */}
        {footer && <div className="flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
};
 