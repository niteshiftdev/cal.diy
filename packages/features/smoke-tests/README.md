# Smoke Test Automation

Automated smoke tests for Cal.diy infrastructure using Trigger.dev scheduled tasks.

## Overview

This feature provides automated smoke tests that run periodically to verify the health of critical Cal.diy systems. Tests can be run on-demand or on a schedule, with optional Slack notifications for failures.

## Architecture

```
packages/features/smoke-tests/
├── di/                                    # Dependency injection setup
│   ├── tokens.ts                          # DI tokens
│   ├── SmokeTestService.module.ts         # Service module
│   └── SmokeTestService.container.ts      # Service container
├── lib/
│   └── tasker/
│       └── trigger/
│           ├── config.ts                  # Trigger.dev configuration
│           ├── schema.ts                  # Zod payload schema
│           ├── run-smoke-tests.ts         # On-demand task
│           └── scheduled-smoke-tests.ts   # Scheduled task
├── services/
│   └── SmokeTestService.ts                # Core smoke test logic
├── types/
│   └── index.ts                           # Type definitions
└── README.md
```

## Test Types

The smoke tests support the following kinds:

- `api-health`: Basic API health check (user count query)
- `database-connection`: Database connectivity test
- `auth-flow`: Authentication system check (session count query)
- `booking-flow`: Booking system check (booking count query)
- `calendar-integration`: Calendar integration check (credential count query)
- `all`: Run all smoke tests

## Usage

### On-Demand Execution

Trigger smoke tests manually via the Trigger.dev dashboard or API:

```typescript
import { tasks } from "@trigger.dev/sdk";

await tasks.trigger("smoke-tests.run", {
  kind: "all",
  notifyOnSuccess: false,
  slackWebhookUrl: process.env.SMOKE_TEST_SLACK_WEBHOOK_URL,
});
```

### Scheduled Execution

The `scheduled-smoke-tests` task runs automatically every 15 minutes:

- Tests: All critical smoke tests
- Notifications: Only on failure
- Schedule: `*/15 * * * *` (every 15 minutes, UTC)

## Environment Variables

### Required

- `TRIGGER_SECRET_KEY`: Trigger.dev API secret key
- `TRIGGER_API_URL`: Trigger.dev API URL (default: `https://api.trigger.dev`)
- `ENABLE_ASYNC_TASKER`: Enable Trigger.dev tasks (set to `"true"`)

### Optional

- `SMOKE_TEST_SLACK_WEBHOOK_URL`: Slack webhook URL for notifications

## Slack Notifications

When configured with a Slack webhook URL, the smoke tests will send notifications:

- **On failure**: Always notified (default)
- **On success**: Only if `notifyOnSuccess: true`

Notification format:

```
✅ Smoke Tests PASSED
✓ database-connection: Database connection successful (45ms)
✓ api-health: API health check successful (123ms)
✓ auth-flow: Auth flow check successful (67ms)
```

## Local Development

1. Set environment variables in `.env`:

   ```bash
   TRIGGER_SECRET_KEY=<your-trigger-secret>
   TRIGGER_API_URL=https://api.trigger.dev
   ENABLE_ASYNC_TASKER="true"
   SMOKE_TEST_SLACK_WEBHOOK_URL=<optional-slack-webhook>
   ```

2. Run the Trigger.dev CLI:

   ```bash
   cd packages/features
   npx trigger.dev@latest dev
   ```

3. Trigger a test run from the Trigger.dev dashboard

## Deployment

### Staging

```bash
cd packages/features
yarn deploy:trigger:staging
```

### Production

Production deployment happens automatically via the `draft-release` CI action.

## Testing

Unit tests are located in `services/__tests__/`:

```bash
TZ=UTC yarn test packages/features/smoke-tests
```

## Configuration

### Concurrency

The smoke test queue is configured with a concurrency limit of 5 tasks:

- Low concurrency is appropriate since smoke tests are read-only health checks
- Prevents resource contention during scheduled runs

### Retry Policy

```typescript
{
  maxAttempts: 2,
  factor: 1.5,
  minTimeoutInMs: 30000,
  maxTimeoutInMs: 120000,
  randomize: true,
  outOfMemory: {
    machine: "medium-1x"
  }
}
```

## Extending Tests

To add a new smoke test:

1. Add the test kind to `types/index.ts`:

   ```typescript
   export type SmokeTestKind = "api-health" | "database-connection" | "new-test" | "all";
   ```

2. Update the Zod schema in `lib/tasker/trigger/schema.ts`:

   ```typescript
   export const smokeTestSchema = z.object({
     kind: z.enum(["api-health", "database-connection", "new-test", "all"]),
     // ...
   });
   ```

3. Implement the test in `services/SmokeTestService.ts`:

   ```typescript
   private async testNewFeature(): Promise<SmokeTestResult> {
     const startTime = Date.now();
     try {
       // Test logic here
       const duration = Date.now() - startTime;
       return {
         kind: "new-test",
         success: true,
         message: "New test passed",
         timestamp: new Date(),
         duration,
       };
     } catch (error) {
       // Error handling
     }
   }
   ```

4. Update the `runSmokeTests` method to include the new test

## Troubleshooting

### Tests not running

- Verify `ENABLE_ASYNC_TASKER="true"` is set
- Check Trigger.dev CLI is running: `cd packages/features && npx trigger.dev@latest dev`
- Verify the trigger directory is in `trigger.config.ts`

### Slack notifications not working

- Verify `SMOKE_TEST_SLACK_WEBHOOK_URL` is set correctly
- Test the webhook URL manually with curl
- Check Trigger.dev logs for errors

### Database connection failures

- Verify `DATABASE_URL` is correct
- Check database server is accessible
- Review Prisma client logs

## References

- [Trigger.dev Documentation](https://trigger.dev/docs)
- [Cal.diy Engineering Standards](https://cal.com/blog/engineering-in-2026-and-beyond)
- [Trigger.dev Task Pattern](../../calendars/lib/tasker/README.md)
