import OnboardingScreen from "@/components/onboarding/OnboardingScreen";
import { ROUTES } from "@/constants/routes";
import { OnboardingCallout } from "@/components/onboarding/OnboardingCallout";
import { useTour } from "@/context/useTour";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";


export default function OnboardingOne() {
  const { t } = useTranslation("onboardingPages");
  const { start } = useTour();
  useEffect(() => {
    const id = window.setTimeout(() => start(), 100);
    return () => window.clearTimeout(id);
  }, [start]);
  return (
    <div data-tour="onboarding-one">
    <OnboardingScreen
      imageSrc="/images/onboarding/onboarding-one.png"
      imageAlt={t("step.one.imageAlt", { defaultValue: "Onboarding step one" })}
      title={t("step.one.title", { defaultValue: "Let's get started!" })}
      subtitle={t("step.one.subtitle", { defaultValue: "Upload your personal info to begin working with your AI Coach." })}
      ctaLabel={t("screen.letsGo", { defaultValue: "Let's go" })}
      nextPath={ROUTES.ONBOARDING.TWO}
      overlays={
          <OnboardingCallout
            title={t("step.one.callout", { defaultValue: "Actionable insights" })}
            positionClass="top-32 md:top-28 right-[3%] md:right-[8%] lg:right-[22%]"
            className="!rounded-b-xl !rounded-tr-xl"
          />
      }
    />
    </div>
  );
}
