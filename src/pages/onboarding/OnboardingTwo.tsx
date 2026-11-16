import OnboardingCallout from "@/components/onboarding/OnboardingCallout";
import OnboardingScreen from "@/components/onboarding/OnboardingScreen";
import { ROUTES } from "@/constants/routes";
import { useTranslation } from "react-i18next";

export default function OnboardingTwo() {
  const { t } = useTranslation("onboardingPages");
  return (
    <div data-tour="onboarding-two">
    <OnboardingScreen
      imageSrc="/images/onboarding/onboarding-two.png"
      imageAlt={t("step.two.imageAlt", { defaultValue: "Onboarding step two" })}
      title={t("step.two.title", { defaultValue: "Empower your business" })}
      subtitle={t("step.two.subtitle", { defaultValue: "Leverage AI-driven insights tailored to your goals." })}
      ctaLabel={t("screen.letsGo", { defaultValue: "Let's go" })}
      nextPath={ROUTES.ONBOARDING.THREE}
      overlays={
          <OnboardingCallout
            title={t("step.two.callout", { defaultValue: "Actionable insights" })}
            positionClass="top-24 md:top-16 right-[2%] md:right-[16%] lg:right-[32%]"
            className="!rounded-b-xl !rounded-tr-xl"
          />
      }
    />
    </div>
  );
}
