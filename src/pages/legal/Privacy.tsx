import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Privacy() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="mb-4 w-full flex justify-start">
          <Button variant="ghost" className="gap-2 px-2" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
        <Card className="shadow-sm">
          <CardHeader className="text-left">
            <CardTitle className="text-2xl">Privacy Policy</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Last updated: {new Date().toLocaleDateString()}</p>
          </CardHeader>
          <CardContent className="text-left space-y-4">
            <p className="text-sm text-muted-foreground">
              Your privacy is important to us. This policy explains what data we collect, how we use it, and your choices.
            </p>

            <div className="divide-y rounded-xl border">
              <Section title="Information We Collect">
                <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                  <li>Account details such as name and email address.</li>
                  <li>Usage data, device information, and interaction analytics.</li>
                  <li>Files and content you upload or share with the platform.</li>
                </ul>
              </Section>
              <Section title="How We Use Information">
                <p className="text-sm text-muted-foreground">
                  We use data to provide and improve services, personalize experiences, ensure security, and comply with legal obligations.
                </p>
              </Section>
              <Section title="Data Sharing & Disclosure">
                <p className="text-sm text-muted-foreground">
                  We do not sell your personal information. We may share it with trusted service providers under strict confidentiality and only as needed.
                </p>
              </Section>
              <Section title="Data Retention">
                <p className="text-sm text-muted-foreground">
                  We retain information only as long as necessary for the purposes set out in this policy, unless a longer retention is required by law.
                </p>
              </Section>
              <Section title="Your Rights & Choices">
                <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                  <li>Access, update, or delete your information where applicable.</li>
                  <li>Opt out of certain processing and marketing communications.</li>
                </ul>
              </Section>
              <Section title="Security">
                <p className="text-sm text-muted-foreground">
                  We implement technical and organizational measures to protect your data. However, no method of transmission is 100% secure.
                </p>
              </Section>
              <Section title="Contact">
                <p className="text-sm text-muted-foreground">
                  For privacy inquiries, please contact support.
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
