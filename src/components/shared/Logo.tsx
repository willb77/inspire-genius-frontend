import { cn } from "@/lib/utils";

export const Logo = ({className}: {className?: string}) => {
    return (
    <div className="w-full flex items-center gap-2">
    <img
      src="/images/inspire-genius-logo.jpg"
      alt="inspires-genius-logo"
      className={cn("h-16", className)}
    />
  </div>
    );
};