import type { INestApplication } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { WebhookRepositoryFixture } from "test/fixtures/repository/webhooks.repository.fixture";
import { randomString } from "test/utils/randomString";
import { withApiAuth } from "test/utils/withApiAuth";
import { AppModule } from "@/app.module";
import { bootstrap } from "@/bootstrap";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";
import type { UserWithProfile } from "@/modules/users/users.repository";

describe("Webhook API Smoke Tests", () => {
  let app: INestApplication;
  const userEmail = `webhook-smoke-${randomString()}@test.com`;
  let user: UserWithProfile;
  let userRepositoryFixture: UserRepositoryFixture;
  let webhookRepositoryFixture: WebhookRepositoryFixture;

  beforeAll(async () => {
    const moduleRef = await withApiAuth(
      userEmail,
      Test.createTestingModule({
        imports: [AppModule, PrismaModule, UsersModule, TokensModule],
      })
    ).compile();

    userRepositoryFixture = new UserRepositoryFixture(moduleRef);
    webhookRepositoryFixture = new WebhookRepositoryFixture(moduleRef);

    user = await userRepositoryFixture.create({
      email: userEmail,
      username: userEmail,
    });

    app = moduleRef.createNestApplication();
    bootstrap(app as NestExpressApplication);

    await app.init();
  });

  afterAll(async () => {
    await userRepositoryFixture.deleteByEmail(user.email);
    await app.close();
  });

  describe("Basic Webhook Operations", () => {
    let createdWebhookId: string;

    it("should create a webhook", async () => {
      const response = await request(app.getHttpServer())
        .post("/v2/webhooks")
        .send({
          subscriberUrl: "https://smoke-test.example.com/webhook",
          triggers: ["BOOKING_CREATED"],
          active: true,
        })
        .expect(201);

      expect(response.body.status).toBe("success");
      expect(response.body.data).toHaveProperty("id");
      expect(response.body.data.subscriberUrl).toBe("https://smoke-test.example.com/webhook");
      expect(response.body.data.triggers).toContain("BOOKING_CREATED");
      expect(response.body.data.active).toBe(true);

      createdWebhookId = response.body.data.id;
    });

    it("should retrieve the created webhook", async () => {
      const response = await request(app.getHttpServer())
        .get(`/v2/webhooks/${createdWebhookId}`)
        .expect(200);

      expect(response.body.status).toBe("success");
      expect(response.body.data.id).toBe(createdWebhookId);
      expect(response.body.data.subscriberUrl).toBe("https://smoke-test.example.com/webhook");
    });

    it("should list webhooks", async () => {
      const response = await request(app.getHttpServer()).get("/v2/webhooks").expect(200);

      expect(response.body.status).toBe("success");
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data.some((wh: any) => wh.id === createdWebhookId)).toBe(true);
    });

    it("should update the webhook", async () => {
      const response = await request(app.getHttpServer())
        .patch(`/v2/webhooks/${createdWebhookId}`)
        .send({
          active: false,
          triggers: ["BOOKING_CREATED", "BOOKING_CANCELLED"],
        })
        .expect(200);

      expect(response.body.status).toBe("success");
      expect(response.body.data.active).toBe(false);
      expect(response.body.data.triggers).toContain("BOOKING_CANCELLED");
    });

    it("should delete the webhook", async () => {
      await request(app.getHttpServer()).delete(`/v2/webhooks/${createdWebhookId}`).expect(200);

      await request(app.getHttpServer()).get(`/v2/webhooks/${createdWebhookId}`).expect(404);
    });
  });

  describe("Webhook Validation", () => {
    it("should reject webhook creation with invalid URL", async () => {
      await request(app.getHttpServer())
        .post("/v2/webhooks")
        .send({
          subscriberUrl: "not-a-valid-url",
          triggers: ["BOOKING_CREATED"],
          active: true,
        })
        .expect(400);
    });

    it("should reject webhook creation with empty triggers", async () => {
      await request(app.getHttpServer())
        .post("/v2/webhooks")
        .send({
          subscriberUrl: "https://example.com/webhook",
          triggers: [],
          active: true,
        })
        .expect(400);
    });
  });
});
