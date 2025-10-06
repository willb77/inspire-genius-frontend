import type { OnboardingCalloutProps } from "@/types/onboarding-types";

export function OnboardingCallout({ title, positionClass, className, icon }: OnboardingCalloutProps) {
  return (
    <div className={"absolute " + positionClass}>
      <div className="flex items-start gap-2">
        {icon ? (
          <div className="shrink-0 rounded-xl bg-[#3158D0] text-white p-3 shadow-md">
            {icon}
          </div>
        ) : null}
        <div
          className={
            "bg-white text-brown-250 font-medium text-xs px-4 py-2 shadow-[0_6px_20px_rgba(0,0,0,0.20)] " +
            (className ?? "")
          }
        >
          {title}
        </div>
      </div>
    </div>
  );
}

export default OnboardingCallout;
