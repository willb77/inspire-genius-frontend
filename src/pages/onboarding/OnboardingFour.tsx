import OnboardingCallout from "@/components/onboarding/OnboardingCallout";
import OnboardingScreen from "@/components/onboarding/OnboardingScreen";
import { ROUTES } from "@/constants/routes";
import { useTranslation } from "react-i18next";

export default function OnboardingFour() {
  const { t } = useTranslation("onboardingPages");
  return (
    <div data-tour="onboarding-four">
    <OnboardingScreen
      imageSrc="/images/onboarding/onboarding-four.png"
      imageAlt={t("step.four.imageAlt", { defaultValue: "Onboarding step four" })}
      title={t("step.four.title", { defaultValue: "Collaborate with your AI Coach" })}
      subtitle={t("step.four.subtitle", { defaultValue: "We keep things simple and effective — so you can focus on impact." })}
ctaLabel={t("screen.letsGo", { defaultValue: "Let's go" })}
      nextPath={ROUTES.ONBOARDING.FIVE}
      overlays={
          <OnboardingCallout
            title={t("step.four.callout", { defaultValue: "Smart decisions with AI" })}
            positionClass="top-20 md:top-14 right-[30%] md:right-[43%] lg:right-[46%]"
            className="!rounded-b-xl !rounded-tr-xl"
          />
      }
    />
    </div>
  );
}
