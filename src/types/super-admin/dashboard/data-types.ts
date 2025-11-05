// Data/display models used in dashboard pages

export type DashboardSystemCardProps = {
  title: string;
  value?: string | number;
  icon: React.ReactNode;
  className?: string;
};

export type ChartDatum = {
  orgName: string;
  hours: number;
};

export type DocumentUploadData = {
  browser: string;
  Uploads: number;
  color: string;
};

export type CoachUsageData = {
  month: string;
  desktop: number;
  mobile: number;
};