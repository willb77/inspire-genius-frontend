import OnboardingCallout from "@/components/onboarding/OnboardingCallout";
import OnboardingScreen from "@/components/onboarding/OnboardingScreen";
import { ROUTES } from "@/constants/routes";

export default function OnboardingFour() {
  return (
    <div data-tour="onboarding-four">
    <OnboardingScreen
      imageSrc="/images/onboarding/onboarding-four.png"
      imageAlt="Onboarding step four"
      title="Collaborate with your AI Coach"
      subtitle="We keep things simple and effective — so you can focus on impact."
ctaLabel="Let's go"
      nextPath={ROUTES.ONBOARDING.FIVE}
      overlays={
          <OnboardingCallout
            title="Smart decisions with AI"
            positionClass="top-20 md:top-14 right-[30%] md:right-[43%] lg:right-[46%]"
            className="!rounded-b-xl !rounded-tr-xl"
          />
      }
    />
    </div>
  );
}
