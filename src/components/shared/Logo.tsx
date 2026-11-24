import { cn } from "@/lib/utils";

export const Logo = ({className}: {className?: string}) => {
    return (
    <div className="w-full flex items-center gap-2">
    <img
      src="/images/logo-dark.png"
      alt="InspiresGenius"
      className={cn("h-16 w-auto", className)}
    />
  </div>
    );
};