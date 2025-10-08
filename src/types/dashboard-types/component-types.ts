// Dashboard page component types

// UserCoachCard component props (used in Dashboard)
export interface UserCoachCardProps {
  title: string;
  gender: string;
  accent: string;
  tone: string;
  extraCount?: number;
  onChat?: () => void;
}

