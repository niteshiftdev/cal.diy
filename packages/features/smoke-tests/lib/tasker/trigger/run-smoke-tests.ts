import { logger, schemaTask, type TaskWithSchema } from "@trigger.dev/sdk";
import type { z } from "zod";

import { smokeTestTaskConfig } from "./config";
import { smokeTestSchema } from "./schema";

export const RUN_SMOKE_TESTS_JOB_ID = "smoke-tests.run";

/**
 * Trigger.dev task for running smoke tests
 *
 * This task can be triggered manually or on a schedule to run
 * smoke tests against the Cal.diy infrastructure.
 *
 * The task:
 * 1. Imports the DI container getter
 * 2. Gets the SmokeTestService instance
 * 3. Runs the smoke tests based on the payload
 * 4. Sends notifications if configured
 */
export const runSmokeTests: TaskWithSchema<
  typeof RUN_SMOKE_TESTS_JOB_ID,
  typeof smokeTestSchema
> = schemaTask({
  id: RUN_SMOKE_TESTS_JOB_ID,
  ...smokeTestTaskConfig,
  schema: smokeTestSchema,
  run: async (payload: z.infer<typeof smokeTestSchema>, { ctx }) => {
    const { getSmokeTestService } = await import(
      "@calcom/features/smoke-tests/di/SmokeTestService.container"
    );

    const smokeTestService = getSmokeTestService();
    const taskId = ctx.run.id;

    try {
      logger.info("Starting smoke tests", { kind: payload.kind, taskId });

      const results = await smokeTestService.runSmokeTests(payload);

      const allSuccess = results.every((r) => r.success);
      const failedTests = results.filter((r) => !r.success);

      if (allSuccess) {
        logger.info("All smoke tests passed", {
          kind: payload.kind,
          taskId,
          totalTests: results.length,
        });
      } else {
        logger.error("Some smoke tests failed", {
          kind: payload.kind,
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
      const message = error instanceof Error ? error.message : "Unknown error in smoke tests";
      logger.error(message, { kind: payload.kind, taskId, error });
      throw error;
    }
  },
});
