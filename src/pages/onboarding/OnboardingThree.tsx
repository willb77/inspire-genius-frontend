import OnboardingCallout from "@/components/onboarding/OnboardingCallout";
import OnboardingScreen from "@/components/onboarding/OnboardingScreen";
import { ROUTES } from "@/constants/routes";

export default function OnboardingThree() {
  return (
    <OnboardingScreen
      imageSrc="/images/onboarding/onboarding-three.png"
      imageAlt="Onboarding step three"
      title="Insights that matter"
      subtitle="We prioritize clarity so you can act with confidence."
    ctaLabel="Let's go"
      nextPath={ROUTES.ONBOARDING.FOUR}
      overlays={
        <>
          <OnboardingCallout
            title="Actionable insights"
            positionClass="top-16 md:top-10 right-[10%] md:right-[30%] lg:right-[38%]"
            className="!rounded-b-xl !rounded-tr-xl"
          />
        </>
      }
    />
  );
}
