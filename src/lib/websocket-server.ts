import { WebSocketManager } from './websocket';
import { paymentMonitor } from '@/services/payment-monitoring';

// Enhanced WebSocket server for real-time monitoring
export class MonitoringWebSocketServer extends WebSocketManager {
  private connections: Set<any> = new Set();
  private isInitialized = false;

  constructor() {
    super();
    this.initializeEventListeners();
  }

  private initializeEventListeners() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Listen to payment monitor events
    paymentMonitor.on('transaction_tracked', (transaction) => {
      this.broadcast('transaction_update', transaction);
    });

    paymentMonitor.on('alert_created', (alert) => {
      this.broadcast('alert_created', alert);
    });

    paymentMonitor.on('metrics_updated', (metrics) => {
      this.broadcast('metrics_update', metrics);
    });

    console.log('MonitoringWebSocketServer: Event listeners initialized');
  }

  addConnection(connection: any) {
    this.connections.add(connection);
    console.log(`WebSocket connection added. Total connections: ${this.connections.size}`);

    // Send current state to new connection
    this.sendCurrentState(connection);

    // Handle connection close
    connection.on('close', () => {
      this.connections.delete(connection);
      console.log(`WebSocket connection removed. Total connections: ${this.connections.size}`);
    });

    // Handle incoming messages
    connection.on('message', async (message: string) => {
      try {
        const data = JSON.parse(message);
        await this.handleMessage(connection, data);
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
        connection.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format'
        }));
      }
    });
  }

  private async sendCurrentState(connection: any) {
    try {
      // Send current metrics
      const metrics = await paymentMonitor.getMetrics('1h');
      connection.send(JSON.stringify({
        type: 'initial_metrics',
        data: metrics
      }));

      // Send active alerts
      const alerts = paymentMonitor.getActiveAlerts();
      connection.send(JSON.stringify({
        type: 'initial_alerts',
        data: alerts
      }));

      // Send anomaly status
      const anomalies = await paymentMonitor.detectAnomalies();
      connection.send(JSON.stringify({
        type: 'initial_anomalies',
        data: anomalies
      }));

    } catch (error) {
      console.error('Error sending current state:', error);
    }
  }

  private async handleMessage(connection: any, message: any) {
    switch (message.type) {
      case 'subscribe':
        // Handle subscription to specific events
        connection.subscribedEvents = message.events || ['all'];
        connection.send(JSON.stringify({
          type: 'subscription_confirmed',
          events: connection.subscribedEvents
        }));
        break;

      case 'get_metrics':
        try {
          const metrics = await paymentMonitor.getMetrics(message.period || '24h');
          connection.send(JSON.stringify({
            type: 'metrics_response',
            data: metrics,
            requestId: message.requestId
          }));
        } catch (error) {
          connection.send(JSON.stringify({
            type: 'error',
            message: 'Failed to fetch metrics',
            requestId: message.requestId
          }));
        }
        break;

      case 'acknowledge_alert':
        try {
          const success = paymentMonitor.acknowledgeAlert(message.alertId);
          connection.send(JSON.stringify({
            type: 'alert_acknowledged',
            success,
            alertId: message.alertId,
            requestId: message.requestId
          }));
        } catch (error) {
          connection.send(JSON.stringify({
            type: 'error',
            message: 'Failed to acknowledge alert',
            requestId: message.requestId
          }));
        }
        break;

      case 'ping':
        connection.send(JSON.stringify({
          type: 'pong',
          timestamp: new Date().toISOString()
        }));
        break;

      default:
        connection.send(JSON.stringify({
          type: 'error',
          message: `Unknown message type: ${message.type}`
        }));
    }
  }

  private broadcast(type: string, data: any) {
    const message = JSON.stringify({
      type,
      data,
      timestamp: new Date().toISOString()
    });

    this.connections.forEach((connection) => {
      try {
        // Check if connection is subscribed to this event type
        if (!connection.subscribedEvents || 
            connection.subscribedEvents.includes('all') || 
            connection.subscribedEvents.includes(type)) {
          connection.send(message);
        }
      } catch (error) {
        console.error('Error broadcasting to connection:', error);
        // Remove failed connection
        this.connections.delete(connection);
      }
    });
  }

  getConnectionCount(): number {
    return this.connections.size;
  }

  // Override the parent method with actual notification sending
  async sendNotificationToUser(userId: string, notification: any): Promise<boolean> {
    try {
      const message = JSON.stringify({
        type: 'notification',
        userId,
        data: notification,
        timestamp: new Date().toISOString()
      });

      // Send to all connections (in a real app, you'd filter by userId)
      this.connections.forEach((connection) => {
        try {
          connection.send(message);
        } catch (error) {
          console.error('Error sending notification:', error);
          this.connections.delete(connection);
        }
      });

      return true;
    } catch (error) {
      console.error('Error sending notification to user:', error);
      return false;
    }
  }
}

// Singleton instance
export const monitoringWebSocket = new MonitoringWebSocketServer();