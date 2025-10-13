import type { OnboardingImageProps } from "@/types/onboarding";

export function OnboardingImage({ src, alt, className, children }: OnboardingImageProps) {
  return (
    <div className={"relative w-full flex items-center justify-center " + (className ?? "")}> 
      <img src={src} alt={alt} className="max-w-full h-96" />
      {children}
    </div>
  );
}

export default OnboardingImage;
