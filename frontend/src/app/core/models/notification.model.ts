export interface NotificationResponse {
  id: number;
  type: string;
  title: string;
  message: string;
  actionPath: string | null;
  read: boolean;
  createdAt: string;
  readAt: string | null;
}

export interface UnreadNotificationCountResponse {
  unreadCount: number;
}