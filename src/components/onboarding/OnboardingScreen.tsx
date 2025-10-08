import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import OnboardingImage from "./OnboardingImage";
import { Logo } from "../shared/Logo";
import type { OnboardingScreenProps } from "@/types/onboarding";

export const OnboardingScreen = ({
  imageSrc,
  imageAlt,
  title,
  subtitle,
  ctaLabel = "Let's go",
  nextPath,
  overlays,
}: OnboardingScreenProps) => {
  const navigate = useNavigate();

  return (
    <div className="w-full h-screen flex flex-col items-center justify-center p-3">
      <Logo />
      <div className="mx-auto w-full text-center">
        <OnboardingImage src={imageSrc} alt={imageAlt}>
          {overlays}
        </OnboardingImage>

        <div className="mt-6">
          <h1 className="text-2xl font-semibold">{title}</h1>
          {subtitle ? (
            <p className="text-sm md:text-base text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>

        <div className="pt-2">
          <Button className="w-fit px-28 h-10" onClick={() => navigate(nextPath)}>
            {ctaLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingScreen;
