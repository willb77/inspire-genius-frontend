import type { ReactNode } from "react";

export interface OnboardingImageProps {
  src: string;
  alt: string;
  className?: string;
  children?: ReactNode;
}

export function OnboardingImage({ src, alt, className, children }: OnboardingImageProps) {
  return (
    <div className={"relative w-full flex items-center justify-center " + (className ?? "")}> 
      <img src={src} alt={alt} className="max-w-full h-96" />
      {children}
    </div>
  );
}

export default OnboardingImage;
