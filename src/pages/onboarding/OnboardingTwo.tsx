import OnboardingCallout from "@/components/onboarding/OnboardingCallout";
import OnboardingScreen from "@/components/onboarding/OnboardingScreen";
import { ROUTES } from "@/constants/routes";

export default function OnboardingTwo() {
  return (
    <OnboardingScreen
      imageSrc="/images/onboarding/onboarding-two.svg"
      imageAlt="Onboarding step two"
      title="Empower your business"
      subtitle="Leverage AI-driven insights tailored to your goals."
      ctaLabel="Let's go"
      nextPath={ROUTES.ONBOARDING.THREE}
      overlays={
        <>
          <OnboardingCallout
            title="Actionable insights"
            positionClass="top-24 md:top-16 right-[2%] md:right-[16%] lg:right-[32%]"
            className="!rounded-b-xl !rounded-tr-xl"
          />
        </>
      }
    />
  );
}
