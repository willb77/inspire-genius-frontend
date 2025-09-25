import UserLayout from "@/layouts/UserLayout";
import { useMemo, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Headset, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function Help() {
  const MAX_CHARS = 500;

  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitted, setShowSubmitted] = useState(false);

  const charsLeft = useMemo(
    () => Math.max(0, MAX_CHARS - message.length),
    [message]
  );

  const onCancel = useCallback(() => {
    setFirstName("");
    setEmail("");
    setMessage("");
    setAgree(false);
  }, []);

  const onSend = useCallback(async () => {
    if (!agree || !firstName || !email || !message) return;
    setSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 600));
    setSubmitting(false);
    setShowSubmitted(true);
  }, [agree, firstName, email, message]);

  return (
    <UserLayout>
      <div className="space-y-4">
        <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          {/* Heading */}
          <h1 className="text-2xl font-semibold tracking-tight">
            Help and Support
          </h1>

          {/* Search Bar */}
          <div className="relative w-full sm:w-128">
            <input
              type="text"
              placeholder="Search..."
              aria-label="Search help topics"
              className="w-full border bg-gray-20 rounded-lg px-4 py-2 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={20}
              strokeWidth={2}
            />
          </div>
        </div>
        <Card className="shadow-none sm:shadow-sm">
          <CardHeader className="text-left">
            <CardTitle className="text-base font-medium tracking-tight">
              Get assistance and resolve issues with ease.
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 text-left">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="firstName" className="mb-2 block text-xs">
                  Your Name
                </Label>
                <Input
                  id="firstName"
                  placeholder="First Name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  aria-describedby="firstName-help"
                />
              </div>
              <div>
                <Label htmlFor="email" className="mb-2 block text-xs">
                  Email
                </Label>
                <Input
                  id="email"
                  placeholder="Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-describedby="email-help"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="message"
                  className="mb-2 block text-xs text-black-250"
                >
                  Message
                </Label>
                <span className="text-[11px] text-gray-400" aria-live="polite">
                  {MAX_CHARS - charsLeft}/{MAX_CHARS}
                </span>
              </div>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, MAX_CHARS))}
                placeholder="Enter your message"
                rows={6}
                aria-describedby="message-help"
                className="file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input w-full min-w-0 rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] md:text-sm"
              />
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <Checkbox
                id="terms-privacy"
                checked={agree}
                onCheckedChange={(checked) => setAgree(!!checked)}
                className="mt-1"
              />
              <Label
                htmlFor="terms-privacy"
                className="text-muted-foreground text-sm leading-snug"
              >
                I agree with the{" "}
                <a
                  href="/terms"
                  className="text-blue-500 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Terms of Use
                </a>{" "}
                &{" "}
                <a
                  href="/privacy"
                  className="text-blue-500 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Privacy Policy
                </a>
              </Label>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row items-center gap-3 justify-end">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={submitting}
              className="w-full sm:w-52 bg-gray-20"
              type="button"
            >
              Cancel
            </Button>

            <Button
              onClick={onSend}
              disabled={
                !agree || submitting || !firstName || !email || !message
              }
              className="w-full sm:w-52"
              type="button"
            >
              {submitting ? "Sending…" : "Send"}
            </Button>
          </CardFooter>
        </Card>

        <Dialog open={showSubmitted} onOpenChange={setShowSubmitted}>
          <DialogContent className="sm:max-w-md">
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <Headset className="h-5 w-5" />
              </div>
            </div>

            <DialogHeader>
              <DialogTitle className="text-center">Issue Submitted</DialogTitle>
              <DialogDescription className="text-center">
                Thanks for reaching out! We'll review your issue soon.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowSubmitted(false)}
                type="button"
              >
                Back
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </UserLayout>
  );
}
