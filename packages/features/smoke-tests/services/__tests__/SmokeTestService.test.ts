import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PrismaClient } from "@prisma/client";

import { SmokeTestService } from "../SmokeTestService";
import type { SmokeTestPayload } from "../../types";

describe("SmokeTestService", () => {
  let smokeTestService: SmokeTestService;
  let mockPrismaClient: Partial<PrismaClient>;

  beforeEach(() => {
    mockPrismaClient = {
      $queryRaw: vi.fn().mockResolvedValue([{ "?column?": 1 }]),
      user: {
        count: vi.fn().mockResolvedValue(100),
      } as any,
      session: {
        count: vi.fn().mockResolvedValue(50),
      } as any,
      booking: {
        count: vi.fn().mockResolvedValue(200),
      } as any,
      credential: {
        count: vi.fn().mockResolvedValue(25),
      } as any,
    };

    smokeTestService = new SmokeTestService({
      prismaClient: mockPrismaClient as PrismaClient,
    });
  });

  describe("runSmokeTests", () => {
    it("should run database connection test", async () => {
      const payload: SmokeTestPayload = {
        kind: "database-connection",
      };

      const results = await smokeTestService.runSmokeTests(payload);

      expect(results).toHaveLength(1);
      expect(results[0].kind).toBe("database-connection");
      expect(results[0].success).toBe(true);
      expect(results[0].message).toContain("successful");
      expect(mockPrismaClient.$queryRaw).toHaveBeenCalled();
    });

    it("should run API health test", async () => {
      const payload: SmokeTestPayload = {
        kind: "api-health",
      };

      const results = await smokeTestService.runSmokeTests(payload);

      expect(results).toHaveLength(1);
      expect(results[0].kind).toBe("api-health");
      expect(results[0].success).toBe(true);
      expect(results[0].metadata?.userCount).toBe(100);
      expect(mockPrismaClient.user?.count).toHaveBeenCalled();
    });

    it("should run auth flow test", async () => {
      const payload: SmokeTestPayload = {
        kind: "auth-flow",
      };

      const results = await smokeTestService.runSmokeTests(payload);

      expect(results).toHaveLength(1);
      expect(results[0].kind).toBe("auth-flow");
      expect(results[0].success).toBe(true);
      expect(results[0].metadata?.sessionCount).toBe(50);
      expect(mockPrismaClient.session?.count).toHaveBeenCalled();
    });

    it("should run booking flow test", async () => {
      const payload: SmokeTestPayload = {
        kind: "booking-flow",
      };

      const results = await smokeTestService.runSmokeTests(payload);

      expect(results).toHaveLength(1);
      expect(results[0].kind).toBe("booking-flow");
      expect(results[0].success).toBe(true);
      expect(results[0].metadata?.bookingCount).toBe(200);
      expect(mockPrismaClient.booking?.count).toHaveBeenCalled();
    });

    it("should run calendar integration test", async () => {
      const payload: SmokeTestPayload = {
        kind: "calendar-integration",
      };

      const results = await smokeTestService.runSmokeTests(payload);

      expect(results).toHaveLength(1);
      expect(results[0].kind).toBe("calendar-integration");
      expect(results[0].success).toBe(true);
      expect(results[0].metadata?.credentialCount).toBe(25);
      expect(mockPrismaClient.credential?.count).toHaveBeenCalled();
    });

    it("should run all tests when kind is 'all'", async () => {
      const payload: SmokeTestPayload = {
        kind: "all",
      };

      const results = await smokeTestService.runSmokeTests(payload);

      expect(results).toHaveLength(3);
      expect(results.map((r) => r.kind)).toContain("database-connection");
      expect(results.map((r) => r.kind)).toContain("api-health");
      expect(results.map((r) => r.kind)).toContain("auth-flow");
    });

    it("should handle database errors gracefully", async () => {
      mockPrismaClient.$queryRaw = vi.fn().mockRejectedValue(new Error("Connection failed"));

      const payload: SmokeTestPayload = {
        kind: "database-connection",
      };

      const results = await smokeTestService.runSmokeTests(payload);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].message).toContain("Connection failed");
    });

    it("should include duration in results", async () => {
      const payload: SmokeTestPayload = {
        kind: "api-health",
      };

      const results = await smokeTestService.runSmokeTests(payload);

      expect(results[0].duration).toBeGreaterThanOrEqual(0);
    });

    it("should include timestamp in results", async () => {
      const payload: SmokeTestPayload = {
        kind: "api-health",
      };

      const beforeTest = new Date();
      const results = await smokeTestService.runSmokeTests(payload);
      const afterTest = new Date();

      expect(results[0].timestamp.getTime()).toBeGreaterThanOrEqual(beforeTest.getTime());
      expect(results[0].timestamp.getTime()).toBeLessThanOrEqual(afterTest.getTime());
    });
  });

  describe("Slack notifications", () => {
    beforeEach(() => {
      global.fetch = vi.fn();
    });

    it("should send Slack notification on failure", async () => {
      mockPrismaClient.$queryRaw = vi.fn().mockRejectedValue(new Error("Database error"));

      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
      });

      const payload: SmokeTestPayload = {
        kind: "database-connection",
        slackWebhookUrl: "https://hooks.slack.com/test",
      };

      await smokeTestService.runSmokeTests(payload);

      expect(global.fetch).toHaveBeenCalledWith(
        "https://hooks.slack.com/test",
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        })
      );

      const callArgs = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.attachments[0].color).toBe("#ff0000"); // Red for failure
      expect(body.attachments[0].title).toContain("FAILED");
    });

    it("should not send notification on success when notifyOnSuccess is false", async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
      });

      const payload: SmokeTestPayload = {
        kind: "database-connection",
        notifyOnSuccess: false,
        slackWebhookUrl: "https://hooks.slack.com/test",
      };

      await smokeTestService.runSmokeTests(payload);

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("should send notification on success when notifyOnSuccess is true", async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
      });

      const payload: SmokeTestPayload = {
        kind: "database-connection",
        notifyOnSuccess: true,
        slackWebhookUrl: "https://hooks.slack.com/test",
      };

      await smokeTestService.runSmokeTests(payload);

      expect(global.fetch).toHaveBeenCalled();

      const callArgs = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.attachments[0].color).toBe("#36a64f"); // Green for success
      expect(body.attachments[0].title).toContain("PASSED");
    });
  });
});
