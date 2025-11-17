import { Logo } from "../shared/Logo";
import { type AuthLayoutProps } from "@/types/auth";

/**
 * AuthLayout renders the two-column split layout used by Login, Sign Up and OTP screens.
 * Left: Illustration + headline. Right: Page-specific content (forms, inputs).
 * This keeps duplication low and follows basic Sonar rules (small components, single responsibility).
 */
export default function AuthLayout({
  leftTitleOne = "Ask. Analyze. Set Goals.",
  leftTitleTwo = "Interact. Problem Solve. Achieve",
  subTitle = "Get answers, guidance, and insights instantly—powered by AI built around you.",
  children,
}: AuthLayoutProps) {
  return (
    <div className="bg-background text-foreground p-3 md:p-6">
      <Logo />
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 lg:grid-cols-2 items-center">
        {/* Left panel */}
        <div className="h-full flex flex-col items-center justify-between">
          <div className="flex-1 flex flex-col items-center justify-start py-8">
            <img
              src="/images/auth/authetication-image.svg"
              alt="Auth illustration"
              className="max-w-xs md:max-w-sm w-full h-auto"
            />
            <h2 className="text-2xl md:text-3xl font-medium text-center">
              {leftTitleOne}
            </h2>
            <h2 className="text-2xl md:text-3xl font-medium text-center">
              {leftTitleTwo}
            </h2>
            <p className="mt-2 text-center text-muted-foreground max-w-md">
              {subTitle}
            </p>
          </div>
        </div>

        {/* Right panel */}
        <div className="md:px-20 w-full">{children}</div>
      </div>
    </div>
  );
}
