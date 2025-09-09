// WebSocket service placeholder - disabled due to missing socket.io dependency

export interface NotificationPayload {
  id: string;
  type: 'payment' | 'security' | 'system' | 'promotion' | 'reminder';
  title: string;
  message: string;
  timestamp: string;
  read?: boolean;
  userId: string;
  priority?: 'low' | 'medium' | 'high';
  actionUrl?: string;
  metadata?: Record<string, any>;
}

export class WebSocketManager {
  // TODO: Implement when socket.io is installed
}

export const webSocketManager = new WebSocketManager();