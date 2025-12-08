import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Terms() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="mb-4 flex justify-start w-full">
          <Button variant="ghost" className="gap-2 px-2" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
        <Card className="shadow-sm">
          <CardHeader className="text-left">
            <CardTitle className="text-2xl">Terms & Conditions</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Last updated: {new Date().toLocaleDateString()}</p>
          </CardHeader>
          <CardContent className="text-left space-y-4">
            <p className="text-sm text-muted-foreground">
              Please read these Terms & Conditions carefully before using our services. By accessing or using the platform, you agree to be bound by these Terms.
            </p>

            <div className="divide-y rounded-xl border">
              <Section title="Acceptance of Terms">
                <p className="text-sm text-muted-foreground">
                  By creating an account or using the services, you affirm that you have read, understood, and agree to these Terms.
                </p>
              </Section>
              <Section title="User Accounts">
                <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                  <li>You are responsible for maintaining the confidentiality of your credentials.</li>
                  <li>You must promptly notify us of any unauthorized use of your account.</li>
                </ul>
              </Section>
              <Section title="Use of Services">
                <p className="text-sm text-muted-foreground">
                  You agree not to misuse the platform, including attempting to disrupt or compromise integrity or security of the services.
                </p>
              </Section>
              <Section title="Content & Intellectual Property">
                <p className="text-sm text-muted-foreground">
                  All content, trademarks, and materials are owned by or licensed to us and protected by applicable laws.
                </p>
              </Section>
              <Section title="Termination">
                <p className="text-sm text-muted-foreground">
                  We may suspend or terminate access to the services for conduct that violates these Terms or is harmful to other users or the platform.
                </p>
              </Section>
              <Section title="Limitation of Liability">
                <p className="text-sm text-muted-foreground">
                  To the maximum extent permitted by law, the platform shall not be liable for indirect, incidental, or consequential damages.
                </p>
              </Section>
              <Section title="Contact">
                <p className="text-sm text-muted-foreground">
                  For questions regarding these Terms, contact support.
                </p>
              </Section>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Collapsible defaultOpen>
      <CollapsibleTrigger className="w-full text-left py-3 px-4 font-medium hover:bg-gray-50">
        {title}
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pb-4 pt-1">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}
