export type SmokeTestKind =
  | "api-health"
  | "database-connection"
  | "booking-flow"
  | "auth-flow"
  | "calendar-integration"
  | "all";

export interface SmokeTestResult {
  kind: SmokeTestKind;
  success: boolean;
  message: string;
  timestamp: Date;
  duration: number;
  metadata?: Record<string, unknown>;
}

export interface SmokeTestPayload {
  kind: SmokeTestKind;
  notifyOnSuccess?: boolean;
  slackWebhookUrl?: string;
}
