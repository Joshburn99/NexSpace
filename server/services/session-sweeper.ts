import { db } from "../db";
import { sql } from "drizzle-orm";
import { applicationLogger } from "../middleware/structured-logger";

/**
 * Session sweeper service to clean up expired sessions
 * Runs every hour to delete sessions older than their expiry time
 */
export class SessionSweeper {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  /**
   * Start the session sweeper with specified interval
   * @param intervalMs - Interval in milliseconds (default: 1 hour)
   */
  start(intervalMs: number = 60 * 60 * 1000) {
    if (this.isRunning) {
      applicationLogger.warn("Session sweeper is already running");
      return;
    }

    // Run immediately on start
    this.sweep();

    // Schedule regular sweeps
    this.intervalId = setInterval(() => {
      this.sweep();
    }, intervalMs);

    this.isRunning = true;
    applicationLogger.info(`Session sweeper started with interval: ${intervalMs}ms`);
  }

  /**
   * Stop the session sweeper
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.isRunning = false;
      applicationLogger.info("Session sweeper stopped");
    }
  }

  /**
   * Perform session cleanup
   * Deletes all expired sessions from the database
   */
  async sweep() {
    try {
      const startTime = Date.now();
      
      // Delete expired sessions
      const result = await db.execute(
        sql`DELETE FROM session WHERE expire < NOW()`
      );

      const deletedCount = result.rowCount || 0;
      const duration = Date.now() - startTime;

      if (deletedCount > 0) {
        applicationLogger.info({
          deletedSessions: deletedCount,
          duration: `${duration}ms`
        }, `Session sweeper cleaned ${deletedCount} expired sessions`);
      } else {
        applicationLogger.debug({
          duration: `${duration}ms`
        }, "Session sweeper found no expired sessions");
      }
    } catch (error) {
      applicationLogger.error({
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }, "Session sweeper failed");
    }
  }

  /**
   * Get session statistics
   */
  async getStats() {
    try {
      const stats = await db.execute(
        sql`
          SELECT 
            COUNT(*) as total_sessions,
            COUNT(CASE WHEN expire > NOW() THEN 1 END) as active_sessions,
            COUNT(CASE WHEN expire <= NOW() THEN 1 END) as expired_sessions,
            MIN(expire) as oldest_expiry,
            MAX(expire) as newest_expiry
          FROM session
        `
      );

      return stats.rows[0];
    } catch (error) {
      applicationLogger.error({
        error: error instanceof Error ? error.message : String(error)
      }, "Failed to get session statistics");
      return null;
    }
  }
}

// Export singleton instance
export const sessionSweeper = new SessionSweeper();