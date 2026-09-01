import SuperAdminLayout from "@/layouts/SuperAdminLayout";
import Settings from "@/components/shared/settings/Settings";

const SuperAdminSettingsPage = () => {
    return (
        <SuperAdminLayout>
            <Settings surface="administration" />
        </SuperAdminLayout>
    );
};

export default SuperAdminSettingsPage;