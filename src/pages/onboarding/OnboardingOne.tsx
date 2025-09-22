import OnboardingScreen from "@/components/onboarding/OnboardingScreen";
import { ROUTES } from "@/constants/routes";
import { OnboardingCallout } from "@/components/onboarding/OnboardingCallout";


export default function OnboardingOne() {
  return (
    <OnboardingScreen
      imageSrc="/images/onboarding/onboarding-one.svg"
      imageAlt="Onboarding step one"
      title="Let's get started!"
      subtitle="Upload your personal info to begin working with your AI Coach."
      ctaLabel="Let's go"
      nextPath={ROUTES.ONBOARDING.TWO}
      overlays={
        <>
          <OnboardingCallout
            title="Actionable insights"
            positionClass="top-32 md:top-28 right-[3%] md:right-[8%] lg:right-[22%]"
            className="!rounded-b-xl !rounded-tr-xl"
          />
        </>
      }
    />
  );
}
