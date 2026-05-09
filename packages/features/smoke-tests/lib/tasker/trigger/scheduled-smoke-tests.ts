import { logger, schedules } from "@trigger.dev/sdk";

import { smokeTestTaskConfig } from "./config";

export const SCHEDULED_SMOKE_TESTS_JOB_ID = "smoke-tests.scheduled";

/**
 * Scheduled Trigger.dev task for running smoke tests
 *
 * This task runs on a cron schedule to periodically verify
 * the health of the Cal.diy infrastructure.
 *
 * Schedule: Every 15 minutes
 * Tests: All critical smoke tests
 * Notifications: Only on failure (via SMOKE_TEST_SLACK_WEBHOOK_URL env var)
 */
export const scheduledSmokeTests = schedules.task({
  id: SCHEDULED_SMOKE_TESTS_JOB_ID,
  ...smokeTestTaskConfig,
  cron: {
    pattern: "*/15 * * * *", // Every 15 minutes
    timezone: "UTC",
  },
  run: async (payload, { ctx }) => {
    const { getSmokeTestService } = await import(
      "@calcom/features/smoke-tests/di/SmokeTestService.container"
    );

    const smokeTestService = getSmokeTestService();
    const taskId = ctx.run.id;

    // Get Slack webhook URL from environment
    const slackWebhookUrl = process.env.SMOKE_TEST_SLACK_WEBHOOK_URL;

    try {
      logger.info("Starting scheduled smoke tests", { taskId });

      const results = await smokeTestService.runSmokeTests({
        kind: "all",
        notifyOnSuccess: false, // Only notify on failure
        slackWebhookUrl,
      });

      const allSuccess = results.every((r) => r.success);
      const failedTests = results.filter((r) => !r.success);

      if (allSuccess) {
        logger.info("All scheduled smoke tests passed", {
          taskId,
          totalTests: results.length,
        });
      } else {
        logger.error("Some scheduled smoke tests failed", {
          taskId,
          totalTests: results.length,
          failedCount: failedTests.length,
          failedTests: failedTests.map((t) => ({ kind: t.kind, message: t.message })),
        });
      }

      return {
        success: allSuccess,
        results,
        taskId,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error in scheduled smoke tests";
      logger.error(message, { taskId, error });
      throw error;
    }
  },
});
