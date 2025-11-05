import OnboardingCallout from "@/components/onboarding/OnboardingCallout";
import OnboardingScreen from "@/components/onboarding/OnboardingScreen";
import { ROUTES } from "@/constants/routes";

export default function OnboardingFive() {
  return (
    <div data-tour="onboarding-five">
    <OnboardingScreen
      imageSrc="/images/onboarding/onboarding-five.png"
      imageAlt="Onboarding step five"
      title="You're all set!"
      subtitle="Let's get you into the app to start making progress."
      ctaLabel="Let's go"
      nextPath={ROUTES.ONBOARDING_DETAILS.ONE}
      overlays={
        <>
          <OnboardingCallout
            title="Upload Documents"
            positionClass="top-32 md:top-28 right-[55%] md:right-[56%] lg:right-[54%]"
            className="!rounded-b-xl !rounded-tr-xl"
          />
        </>
      }
    />
    </div>
  );
}
