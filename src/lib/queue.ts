// Queue service placeholder - disabled due to missing dependencies (bullmq, ioredis)
export class QueueManager {
  // TODO: Implement when bullmq and ioredis are installed
}

export const queueManager = new QueueManager();
export const queueService = queueManager; // Alias for compatibility