import { type schemaTask, queue } from "@trigger.dev/sdk";

type SmokeTestTask = Pick<Parameters<typeof schemaTask>[0], "machine" | "retry" | "queue">;

export const smokeTestQueue = queue({
  name: "smoke-tests",
  concurrencyLimit: 5,
});

export const smokeTestTaskConfig: SmokeTestTask = {
  machine: "small-2x",
  queue: smokeTestQueue,
  retry: {
    maxAttempts: 2,
    factor: 1.5,
    minTimeoutInMs: 30000,
    maxTimeoutInMs: 120000,
    randomize: true,
    outOfMemory: {
      machine: "medium-1x",
    },
  },
};
