# Webhook API Smoke Test Summary

**Test ID:** current-webhook-smoke  
**API Reference:** api_current_1778374289_8782b3de  
**Date:** 2026-05-10  
**Status:** Documented

## Test Coverage

### 1. Basic Webhook Operations

#### Create Webhook
- **Endpoint:** `POST /v2/webhooks`
- **Test:** Create a webhook with valid parameters
- **Expected:** Returns 201 with webhook object containing id, subscriberUrl, triggers, and active status

#### Retrieve Webhook
- **Endpoint:** `GET /v2/webhooks/:id`
- **Test:** Retrieve a specific webhook by ID
- **Expected:** Returns 200 with complete webhook details

#### List Webhooks
- **Endpoint:** `GET /v2/webhooks`
- **Test:** List all webhooks for authenticated user
- **Expected:** Returns 200 with array of webhooks

#### Update Webhook
- **Endpoint:** `PATCH /v2/webhooks/:id`
- **Test:** Update webhook active status and triggers
- **Expected:** Returns 200 with updated webhook object

#### Delete Webhook
- **Endpoint:** `DELETE /v2/webhooks/:id`
- **Test:** Delete a webhook and verify it's gone
- **Expected:** Returns 200, subsequent GET returns 404

### 2. Webhook Validation

#### Invalid URL Rejection
- **Test:** Attempt to create webhook with malformed URL
- **Expected:** Returns 400 Bad Request

#### Empty Triggers Rejection
- **Test:** Attempt to create webhook with empty triggers array
- **Expected:** Returns 400 Bad Request

## Test Implementation

Location: `/root/cal.diy/apps/api/v2/test/smoke/webhook-smoke.spec.ts`

The smoke test verifies core CRUD operations and basic validation for the webhook API endpoints.

## Requirements for Execution

1. **Database:** PostgreSQL connection required
2. **Redis:** Optional (warnings acceptable)
3. **Environment:** Test database with proper schema
4. **Authentication:** API auth token for test user

## Running the Test

```bash
yarn workspace @calcom/api-v2 test test/smoke/webhook-smoke.spec.ts
```

## Notes

- Redis connection errors are expected in test environments without Redis
- Tests require database migrations to be current
- Each test creates and cleans up its own test data
- Tests verify both success and error scenarios

## Smoke Test Checklist

- [x] Webhook creation with valid data
- [x] Webhook retrieval by ID
- [x] Webhook listing
- [x] Webhook updates
- [x] Webhook deletion
- [x] Invalid URL validation
- [x] Empty triggers validation

## Related Files

- Webhook Controller: `apps/api/v2/src/modules/webhooks/controllers/webhooks.controller.ts`
- E2E Tests: `apps/api/v2/src/modules/webhooks/controllers/webhooks.controller.e2e-spec.ts`
- Webhook E2E (Playwright): `apps/web/playwright/webhook.e2e.ts`
