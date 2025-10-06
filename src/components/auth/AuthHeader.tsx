import { type AuthHeaderProps } from "@/types/auth-types";

export default function AuthHeader({ title, subtitle }: AuthHeaderProps) {
  return (
    <div className="w-full mb-6">
      <h1 className="text-left w-full text-2xl md:text-3xl font-semibold tracking-tight">{title}</h1>
      {subtitle ? (
        <p className="text-left w-full mt-1 text-sm text-muted-foreground">{subtitle}</p>
      ) : null}
    </div>
  );
}
