export interface BadgeProgressResponse {
  code: string;
  title: string;
  description: string;
  unlocked: boolean;
  unlockedAt: string | null;
  progress: number;
  target: number;
}

export interface MyBadgesResponse {
  badges: BadgeProgressResponse[];
}