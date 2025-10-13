import { Card, CardContent, CardTitle } from "@/components/ui/card";

type OrganizationStatCardProps = {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  className?: string;
};

export default function OrganizationStatCard({ title, value, icon, className }: OrganizationStatCardProps) {
  return (
    <Card className={"bg-white shadow-none border-none" + (className ?? "") }>
      <CardContent>
        <div className="flex items-center justify-between pb-4">
          <CardTitle className="text-lg font-normal text-gray-700">
            {title}
          </CardTitle>
          {icon}
        </div>
        <div className="text-2xl font-semibold text-gray-900 text-left">
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
