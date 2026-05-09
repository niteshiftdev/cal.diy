import type { PrismaClient } from "@prisma/client";

import { logger } from "@calcom/lib/logger";

import type { SmokeTestKind, SmokeTestResult, SmokeTestPayload } from "../types";

export interface ISmokeTestServiceDeps {
  prismaClient: PrismaClient;
}

export class SmokeTestService {
  constructor(private deps: ISmokeTestServiceDeps) {}

  async runSmokeTests(payload: SmokeTestPayload): Promise<SmokeTestResult[]> {
    const results: SmokeTestResult[] = [];

    if (payload.kind === "all") {
      results.push(await this.testDatabaseConnection());
      results.push(await this.testApiHealth());
      results.push(await this.testAuthFlow());
    } else {
      switch (payload.kind) {
        case "database-connection":
          results.push(await this.testDatabaseConnection());
          break;
        case "api-health":
          results.push(await this.testApiHealth());
          break;
        case "auth-flow":
          results.push(await this.testAuthFlow());
          break;
        case "booking-flow":
          results.push(await this.testBookingFlow());
          break;
        case "calendar-integration":
          results.push(await this.testCalendarIntegration());
          break;
      }
    }

    // Send notifications if configured
    if (payload.slackWebhookUrl) {
      await this.sendSlackNotification(results, payload);
    }

    return results;
  }

  private async testDatabaseConnection(): Promise<SmokeTestResult> {
    const startTime = Date.now();
    try {
      // Test basic database connectivity
      await this.deps.prismaClient.$queryRaw`SELECT 1`;

      const duration = Date.now() - startTime;
      logger.info("Smoke test: Database connection successful", { duration });

      return {
        kind: "database-connection",
        success: true,
        message: "Database connection successful",
        timestamp: new Date(),
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const message = error instanceof Error ? error.message : "Unknown database error";
      logger.error("Smoke test: Database connection failed", { error: message, duration });

      return {
        kind: "database-connection",
        success: false,
        message: `Database connection failed: ${message}`,
        timestamp: new Date(),
        duration,
      };
    }
  }

  private async testApiHealth(): Promise<SmokeTestResult> {
    const startTime = Date.now();
    try {
      // Test basic query that exercises the ORM
      const userCount = await this.deps.prismaClient.user.count();

      const duration = Date.now() - startTime;
      logger.info("Smoke test: API health check successful", { duration, userCount });

      return {
        kind: "api-health",
        success: true,
        message: "API health check successful",
        timestamp: new Date(),
        duration,
        metadata: { userCount },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const message = error instanceof Error ? error.message : "Unknown API error";
      logger.error("Smoke test: API health check failed", { error: message, duration });

      return {
        kind: "api-health",
        success: false,
        message: `API health check failed: ${message}`,
        timestamp: new Date(),
        duration,
      };
    }
  }

  private async testAuthFlow(): Promise<SmokeTestResult> {
    const startTime = Date.now();
    try {
      // Test that we can query users and sessions tables
      const sessionCount = await this.deps.prismaClient.session.count();

      const duration = Date.now() - startTime;
      logger.info("Smoke test: Auth flow check successful", { duration, sessionCount });

      return {
        kind: "auth-flow",
        success: true,
        message: "Auth flow check successful",
        timestamp: new Date(),
        duration,
        metadata: { sessionCount },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const message = error instanceof Error ? error.message : "Unknown auth error";
      logger.error("Smoke test: Auth flow check failed", { error: message, duration });

      return {
        kind: "auth-flow",
        success: false,
        message: `Auth flow check failed: ${message}`,
        timestamp: new Date(),
        duration,
      };
    }
  }

  private async testBookingFlow(): Promise<SmokeTestResult> {
    const startTime = Date.now();
    try {
      // Test that we can query bookings table
      const bookingCount = await this.deps.prismaClient.booking.count();

      const duration = Date.now() - startTime;
      logger.info("Smoke test: Booking flow check successful", { duration, bookingCount });

      return {
        kind: "booking-flow",
        success: true,
        message: "Booking flow check successful",
        timestamp: new Date(),
        duration,
        metadata: { bookingCount },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const message = error instanceof Error ? error.message : "Unknown booking error";
      logger.error("Smoke test: Booking flow check failed", { error: message, duration });

      return {
        kind: "booking-flow",
        success: false,
        message: `Booking flow check failed: ${message}`,
        timestamp: new Date(),
        duration,
      };
    }
  }

  private async testCalendarIntegration(): Promise<SmokeTestResult> {
    const startTime = Date.now();
    try {
      // Test that we can query credentials table for calendar integrations
      const credentialCount = await this.deps.prismaClient.credential.count({
        where: {
          type: {
            contains: "calendar",
          },
        },
      });

      const duration = Date.now() - startTime;
      logger.info("Smoke test: Calendar integration check successful", { duration, credentialCount });

      return {
        kind: "calendar-integration",
        success: true,
        message: "Calendar integration check successful",
        timestamp: new Date(),
        duration,
        metadata: { credentialCount },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const message = error instanceof Error ? error.message : "Unknown calendar integration error";
      logger.error("Smoke test: Calendar integration check failed", { error: message, duration });

      return {
        kind: "calendar-integration",
        success: false,
        message: `Calendar integration check failed: ${message}`,
        timestamp: new Date(),
        duration,
      };
    }
  }

  private async sendSlackNotification(
    results: SmokeTestResult[],
    payload: SmokeTestPayload
  ): Promise<void> {
    if (!payload.slackWebhookUrl) return;

    const allSuccess = results.every((r) => r.success);

    // Skip notification if all tests passed and notifyOnSuccess is false
    if (allSuccess && !payload.notifyOnSuccess) {
      return;
    }

    const emoji = allSuccess ? "✅" : "❌";
    const status = allSuccess ? "PASSED" : "FAILED";
    const color = allSuccess ? "#36a64f" : "#ff0000";

    const fields = results.map((result) => ({
      title: result.kind,
      value: `${result.success ? "✓" : "✗"} ${result.message} (${result.duration}ms)`,
      short: false,
    }));

    const slackPayload = {
      username: "Cal.diy Smoke Tests",
      icon_emoji: emoji,
      attachments: [
        {
          color,
          title: `Smoke Tests ${status}`,
          fields,
          footer: "Cal.diy Smoke Test Automation",
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    };

    try {
      const response = await fetch(payload.slackWebhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(slackPayload),
      });

      if (!response.ok) {
        logger.error("Failed to send Slack notification", {
          status: response.status,
          statusText: response.statusText,
        });
      } else {
        logger.info("Slack notification sent successfully");
      }
    } catch (error) {
      logger.error("Error sending Slack notification", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}
