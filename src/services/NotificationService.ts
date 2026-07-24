type NotificationItem = {
  id: string;
  message: string;
};

export class NotificationService {
  async list(userId?: string): Promise<NotificationItem[]> {
    void userId;
    return [];
  }

  async markAllRead(userId?: string): Promise<boolean> {
    void userId;
    return true;
  }
}
