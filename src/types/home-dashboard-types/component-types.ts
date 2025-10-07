// Home and Dashboard component related types
// These are for components outside the chat folder

// UserCoachCard component props (from src/components/user/UserCoachCard.tsx)
export interface UserCoachCardProps {
  title: string;
  gender: string;
  accent: string;
  tone: string;
  extraCount?: number;
  onChat?: () => void;
}
