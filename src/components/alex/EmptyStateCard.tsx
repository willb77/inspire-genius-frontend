import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import OnboardingCallout from "@/components/onboarding/OnboardingCallout";

export default function EmptyStateCard({ onStart }: { onStart: () => void }) {
  return (
    <Card className="border-none shadow-none">
      <CardContent className="space-y-3 relative">
        <div className="relative flex items-center justify-center h-72">
          <img src="/images/user/home/help-alex.svg" alt="Ask Alex" className="h-64 object-cover" />
          <OnboardingCallout
            title="How can i help you?"
            positionClass="z-10 absolute top-[50%] md:top-36 right-[0%] md:right-[20%] lg:right-[0%]"
            className="!rounded-b-xl !rounded-tr-xl"
          />
          <OnboardingCallout
            title="Hey ,I’m Alex"
            positionClass="z-10 absolute top-[5%] md:top-10 lg:top-10 right-[60%] md:right-[60%] lg:right-[60%]"
            className="!rounded-b-xl !rounded-tr-xl !text-blue-primary"
          />
          <img src="/images/user/home/alex-stars.svg" alt="Alex" className="absolute top-0 right-0  md:right-[20%] lg:right-[10%]" />
        </div>

        <div className="absolute -bottom-12 left-0 w-full flex flex-col gap-2">
          <Button onClick={() => onStart()} className="w-full h-12 bg-blue-primary hover:bg-blue-primary/80 text-white" variant="secondary">
            <img src="/images/user/home/tour.svg" alt="Tour" className="w-5 h-5" />
            <span className="ml-2">Take a Tour</span>
          </Button>
          <Button className="w-full h-12 bg-brown-350 hover:bg-brown-350/80 text-white" variant="outline">
            <img src="/images/user/home/how-to-use.svg" alt="How to use" className="w-5 h-5" />
            <span className="ml-2">How to use</span>
          </Button>
          <Button className="w-full h-12 bg-brown-250 hover:bg-brown-250/80 text-white" variant="destructive">
            <img src="/images/user/home/coaches.svg" alt="Coaches" className="w-5 h-5" />
            <span className="ml-2">Coaches Introduction</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
