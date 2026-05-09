# Smoke Test Automation - Usage Guide

## Quick Start

### 1. Environment Setup

Add these variables to your `.env` file:

```bash
# Required for Trigger.dev
TRIGGER_SECRET_KEY=your_trigger_secret_key_here
TRIGGER_API_URL=https://api.trigger.dev
ENABLE_ASYNC_TASKER="true"

# Optional: Slack notifications
SMOKE_TEST_SLACK_WEBHOOK_URL=https://example.com/your-slack-webhook-url
```

### 2. Local Development

Start the Trigger.dev CLI:

```bash
cd packages/features
npx trigger.dev@latest dev --analyze
```

Keep this terminal running while developing.

### 3. Trigger a Test Run

#### Option A: Via Trigger.dev Dashboard

1. Navigate to https://cloud.trigger.dev
2. Select your project
3. Go to **Tasks** tab
4. Find `smoke-tests.run`
5. Click **Test**
6. Enter payload:

   ```json
   {
     "kind": "all",
     "notifyOnSuccess": false,
     "slackWebhookUrl": "https://hooks.slack.com/services/T00000000/B00000000/XXXX"
   }
   ```

7. Click **Run test**

#### Option B: Via Code

```typescript
import { tasks } from "@trigger.dev/sdk";

const result = await tasks.trigger("smoke-tests.run", {
  kind: "all",
  notifyOnSuccess: false,
  slackWebhookUrl: process.env.SMOKE_TEST_SLACK_WEBHOOK_URL,
});

console.log("Test results:", result);
```

## Test Types

### Run All Tests

```json
{
  "kind": "all"
}
```

### Run Specific Test

```json
{
  "kind": "database-connection"
}
```

Available test kinds:

- `database-connection` - Tests Prisma database connectivity
- `api-health` - Tests basic API queries (user count)
- `auth-flow` - Tests authentication system (session count)
- `booking-flow` - Tests booking system (booking count)
- `calendar-integration` - Tests calendar integrations (credential count)

## Scheduled Tests

The scheduled task runs automatically every 15 minutes:

- **Job ID**: `smoke-tests.scheduled`
- **Schedule**: `*/15 * * * *` (every 15 minutes)
- **Tests**: All tests (`kind: "all"`)
- **Notifications**: Only on failure

To view scheduled runs:

1. Go to Trigger.dev dashboard
2. Navigate to **Tasks** → **smoke-tests.scheduled**
3. View run history and logs

## Slack Notifications

### Setup Slack Webhook

1. Create a Slack app at https://api.slack.com/apps
2. Enable Incoming Webhooks
3. Create a webhook for your channel
4. Copy the webhook URL
5. Add to `.env`:

   ```bash
   SMOKE_TEST_SLACK_WEBHOOK_URL=https://example.com/your-slack-webhook-urlXXXXXXXXXXXXXXXXXXXX
   ```

### Notification Behavior

- **Failures**: Always notified (red message with ❌)
- **Success**: Only if `notifyOnSuccess: true` (green message with ✅)

### Example Notification

```
✅ Smoke Tests PASSED

database-connection
✓ Database connection successful (45ms)

api-health
✓ API health check successful (123ms)

auth-flow
✓ Auth flow check successful (67ms)
```

## Deployment

### Deploy to Staging

```bash
cd packages/features
yarn deploy:trigger:staging
```

After deployment:

1. Go to Trigger.dev dashboard
2. Switch to **Staging** environment
3. Navigate to **Tasks** tab
4. Test the task using the **Test** tab

### Deploy to Production

Production deployment happens automatically via CI when code is merged to main.

## Monitoring

### View Task Logs

1. Go to Trigger.dev dashboard
2. Navigate to **Tasks** → Select your task
3. Click on a run to view:
   - Execution logs
   - Duration
   - Success/failure status
   - Payload and results

### Check Task Health

Monitor these metrics:

- Success rate (should be >99%)
- Average duration (should be <5 seconds)
- Failure patterns (consecutive failures indicate infrastructure issues)

## Troubleshooting

### Task Not Appearing in Dashboard

**Problem**: The task doesn't show up in the Trigger.dev dashboard

**Solutions**:

1. Verify `trigger.config.ts` includes the smoke-tests directory:

   ```typescript
   dirs: [
     // ...
     "./smoke-tests/lib/tasker/trigger",
   ];
   ```

2. Restart the Trigger.dev CLI:

   ```bash
   cd packages/features
   npx trigger.dev@latest dev
   ```

### Slack Notifications Not Sending

**Problem**: Tests run but no Slack messages appear

**Solutions**:

1. Verify webhook URL is correct:

   ```bash
   curl -X POST $SMOKE_TEST_SLACK_WEBHOOK_URL \
     -H 'Content-Type: application/json' \
     -d '{"text":"Test message"}'
   ```

2. Check Trigger.dev logs for errors
3. Ensure `slackWebhookUrl` is in the payload

### Database Connection Failures

**Problem**: `database-connection` test fails

**Solutions**:

1. Verify `DATABASE_URL` in `.env`
2. Check database server is running
3. Test connection manually:

   ```bash
   psql $DATABASE_URL -c "SELECT 1"
   ```

### Tests Timing Out

**Problem**: Tests exceed max duration

**Solutions**:

1. Check database performance
2. Increase `maxDuration` in `config.ts`:

   ```typescript
   retry: {
     maxTimeoutInMs: 300000, // 5 minutes
   }
   ```

3. Investigate slow queries in Prisma logs

## Best Practices

### 1. Start Simple

Begin with basic tests and expand:

```typescript
// Start with this
{
  "kind": "database-connection"
}

// Then expand to all tests
{
  "kind": "all"
}
```

### 2. Monitor Trends

Track test duration over time:

- Increasing duration may indicate performance degradation
- Consistent failures suggest infrastructure issues

### 3. Adjust Schedule Based on Load

Default: Every 15 minutes

- High-traffic environments: Every 5 minutes
- Low-traffic/staging: Every 30 minutes

Edit `scheduled-smoke-tests.ts`:

```typescript
cron: {
  pattern: "*/5 * * * *",  // Every 5 minutes
  timezone: "UTC"
}
```

### 4. Use Different Webhooks for Environments

```bash
# .env.production
SMOKE_TEST_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/PROD/WEBHOOK

# .env.staging
SMOKE_TEST_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/STAGING/WEBHOOK
```

## Examples

### Example 1: Morning Health Check

Run all tests with notifications:

```json
{
  "kind": "all",
  "notifyOnSuccess": true,
  "slackWebhookUrl": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
}
```

### Example 2: Silent Database Check

Check database only, no notifications:

```json
{
  "kind": "database-connection"
}
```

### Example 3: Pre-Deployment Verification

Before deploying, run all tests and notify on both success and failure:

```json
{
  "kind": "all",
  "notifyOnSuccess": true,
  "slackWebhookUrl": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
}
```

## Next Steps

1. **Add Custom Tests**: Extend `SmokeTestService.ts` with domain-specific tests
2. **Integrate with CI/CD**: Trigger smoke tests before/after deployments
3. **Set Up Alerts**: Configure Slack alerts for failures
4. **Monitor Metrics**: Track success rate and duration trends

## Support

For issues or questions:

- Check [Trigger.dev documentation](https://trigger.dev/docs)
- Review [Cal.diy engineering standards](https://cal.com/blog/engineering-in-2026-and-beyond)
- File an issue in the repository
