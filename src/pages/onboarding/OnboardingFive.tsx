import OnboardingCallout from "@/components/onboarding/OnboardingCallout";
import OnboardingScreen from "@/components/onboarding/OnboardingScreen";
import { ROUTES } from "@/constants/routes";
import { useTranslation } from "react-i18next";

export default function OnboardingFive() {
  const { t } = useTranslation("onboardingPages");
  return (
    <div data-tour="onboarding-five">
    <OnboardingScreen
      imageSrc="/images/onboarding/onboarding-five.png"
      imageAlt={t("step.five.imageAlt", { defaultValue: "Onboarding step five" })}
      title={t("step.five.title", { defaultValue: "You're all set!" })}
      subtitle={t("step.five.subtitle", { defaultValue: "Let's get you into the app to start making progress." })}
      ctaLabel={t("screen.letsGo", { defaultValue: "Let's go" })}
      nextPath={ROUTES.ONBOARDING_DETAILS.ONE}
      overlays={
          <OnboardingCallout
            title={t("step.five.callout", { defaultValue: "Upload Documents" })}
            positionClass="top-32 md:top-28 right-[55%] md:right-[56%] lg:right-[54%]"
            className="!rounded-b-xl !rounded-tr-xl"
          />
      }
    />
    </div>
  );
}
