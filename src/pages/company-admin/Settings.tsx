import { useTranslation } from "react-i18next"
import CompanyAdminLayout from "@/layouts/CompanyAdminLayout"
import DataCard from "@/components/dashboard/DataCard"
import { Info, Building2, Shield, Bell } from "lucide-react"

export default function CompanyAdminSettings() {
  const { t } = useTranslation("companyAdminPages")
  return (
    <CompanyAdminLayout>
      <h1 className="text-xl font-bold text-[#111827] mb-1">{t("settingsTitle", { defaultValue: "Settings" })}</h1>
      <p className="text-[13px] text-[#6b7280] mb-3">{t("settingsSubtitle", { defaultValue: "Company admin settings and preferences." })}</p>

      {/* Placeholder Data Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5 flex items-start gap-2">
        <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-[13px] text-amber-800">
          {t("settingsDevNotice", { defaultValue: "Settings management is under development. Configuration options will be available soon." })}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <DataCard title={t("settingsOrgProfile", { defaultValue: "Organization Profile" })} className="!mt-0">
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-[#f9fafb] rounded-lg">
              <Building2 className="w-5 h-5 text-[#3B5BFF]" />
              <div>
                <div className="text-[13px] font-semibold text-[#1f2937]">{t("settingsCompanyName", { defaultValue: "Company Name" })}</div>
                <div className="text-xs text-[#6b7280]">{t("settingsCompanyNameHint", { defaultValue: "Configure your organization display name" })}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-[#f9fafb] rounded-lg">
              <Shield className="w-5 h-5 text-[#8B5CF6]" />
              <div>
                <div className="text-[13px] font-semibold text-[#1f2937]">{t("settingsSecurity", { defaultValue: "Security Policies" })}</div>
                <div className="text-xs text-[#6b7280]">{t("settingsSecurityHint", { defaultValue: "MFA requirements, password policies, session timeouts" })}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-[#f9fafb] rounded-lg">
              <Bell className="w-5 h-5 text-[#D97706]" />
              <div>
                <div className="text-[13px] font-semibold text-[#1f2937]">{t("settingsNotifications", { defaultValue: "Notification Preferences" })}</div>
                <div className="text-xs text-[#6b7280]">{t("settingsNotificationsHint", { defaultValue: "Email and in-app notification settings" })}</div>
              </div>
            </div>
          </div>
        </DataCard>

        <DataCard title={t("settingsLicenseBilling", { defaultValue: "License & Billing" })} className="!mt-0">
          <div className="space-y-3">
            <div className="p-3 bg-[#f9fafb] rounded-lg">
              <div className="text-[13px] font-semibold text-[#1f2937]">{t("settingsCurrentPlan", { defaultValue: "Current Plan" })}</div>
              <div className="text-xs text-[#6b7280] mt-0.5">{t("settingsPlanValue", { defaultValue: "Enterprise (247 seats)" })}</div>
            </div>
            <div className="p-3 bg-[#f9fafb] rounded-lg">
              <div className="text-[13px] font-semibold text-[#1f2937]">{t("settingsBillingCycle", { defaultValue: "Billing Cycle" })}</div>
              <div className="text-xs text-[#6b7280] mt-0.5">{t("settingsAnnualRenewal", { defaultValue: "Annual renewal" })}</div>
            </div>
            <div className="p-3 bg-[#f9fafb] rounded-lg">
              <div className="text-[13px] font-semibold text-[#1f2937]">{t("settingsNextRenewal", { defaultValue: "Next Renewal" })}</div>
              <div className="text-xs text-[#6b7280] mt-0.5">{t("settingsContactSupport", { defaultValue: "Contact support for details" })}</div>
            </div>
          </div>
        </DataCard>
      </div>
    </CompanyAdminLayout>
  )
}
