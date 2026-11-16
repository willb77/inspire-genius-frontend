import OnboardingCallout from "@/components/onboarding/OnboardingCallout";
import OnboardingScreen from "@/components/onboarding/OnboardingScreen";
import { ROUTES } from "@/constants/routes";
import { useTranslation } from "react-i18next";

export default function OnboardingThree() {
  const { t } = useTranslation("onboardingPages");
  return (
    <div data-tour="onboarding-three">
    <OnboardingScreen
      imageSrc="/images/onboarding/onboarding-three.png"
      imageAlt={t("step.three.imageAlt", { defaultValue: "Onboarding step three" })}
      title={t("step.three.title", { defaultValue: "Insights that matter" })}
      subtitle={t("step.three.subtitle", { defaultValue: "We prioritize clarity so you can act with confidence." })}
    ctaLabel={t("screen.letsGo", { defaultValue: "Let's go" })}
      nextPath={ROUTES.ONBOARDING.FOUR}
      overlays={
          <OnboardingCallout
            title={t("step.three.callout", { defaultValue: "Actionable insights" })}
            positionClass="top-16 md:top-10 right-[10%] md:right-[30%] lg:right-[38%]"
            className="!rounded-b-xl !rounded-tr-xl"
          />
      }
    />
    </div>
  );
}
