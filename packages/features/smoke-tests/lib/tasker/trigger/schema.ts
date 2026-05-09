import { z } from "zod";

export const smokeTestSchema = z.object({
  kind: z.enum([
    "api-health",
    "database-connection",
    "booking-flow",
    "auth-flow",
    "calendar-integration",
    "all",
  ]),
  notifyOnSuccess: z.boolean().optional().default(false),
  slackWebhookUrl: z.string().optional(),
});

export type SmokeTestPayload = z.infer<typeof smokeTestSchema>;
