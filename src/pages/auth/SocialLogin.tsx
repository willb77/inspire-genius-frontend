import { useSocialLogin } from "@/hooks/auth/useSocialLogin";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function SocialLogin() {
  const { t } = useTranslation('authPages');
  const { status } = useSocialLogin();

  return (
    <div className="min-h-screen w-full grid place-items-center p-6">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className={`size-4 ${status === "processing" ? "animate-spin" : ""}`} />
        <span>
          {status === "processing" && t("social.processing", { defaultValue: "Completing social login..." })}
          {status === "done" && t("social.done", { defaultValue: "Login verified. You can close this tab if it doesn't redirect automatically." })}
          {status === "error" && t("social.error", { defaultValue: "Redirecting to login..." })}
        </span>
      </div>
    </div>
  );
}
