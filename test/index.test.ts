import nock from "nock";
import myProbotApp from "../src/index.js";
import { Probot, ProbotOctokit } from "probot";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { describe, beforeEach, afterEach, test, expect, vi } from "vitest";
import type { GitHubApi } from "../src/types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const privateKey = fs.readFileSync(
  path.join(__dirname, "fixtures/mock-cert.pem"),
  "utf-8",
);

// Mock config for testing
vi.mock('../src/config.js', () => ({
  getConfig: vi.fn(() => ({
    github: {
      org: 'fluffylabs',
      team: 'core-team',
      botName: 'fluffylabs-bot'
    },
    blockchain: {
      maxDotTip: 100,
      maxUsdcTip: 1000
    }
  }))
}));

const tipCommentPayload = {
  action: "created",
  issue: {
    number: 1,
    user: {
      login: "hiimbex",
    },
  },
  comment: {
    user: {
      login: "alice",
      type: "User"
    },
    body: "@fluffylabs-bot tip 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY 10 DOT great work!"
  },
  repository: {
    name: "testing-things",
    owner: {
      login: "hiimbex",
    },
  },
  installation: {
    id: 2,
  },
};

describe("Tipping Bot E2E", () => {
  let probot: Probot;

  beforeEach(() => {
    nock.disableNetConnect();
    probot = new Probot({
      appId: 123,
      privateKey,
      Octokit: ProbotOctokit.defaults({
        retry: { enabled: false },
        throttle: { enabled: false },
      }),
    });
    probot.load(myProbotApp);
  });

  test("processes valid tip command from authorized user", async () => {
    const mock = nock("https://api.github.com")
      .post("/app/installations/2/access_tokens")
      .reply(200, {
        token: "test",
        permissions: {
          issues: "write",
        },
      })
      // Mock team membership check
      .get("/orgs/fluffylabs/teams/core-team")
      .reply(200, { slug: "core-team" })
      .get("/orgs/fluffylabs/teams/core-team/memberships/alice")
      .reply(200, { state: "active" })
      // Expect success comment
      .post("/repos/hiimbex/testing-things/issues/1/comments", (body: { body: string }) => {
        expect(body.body).toContain("✅ **Tip validated**");
        expect(body.body).toContain("@alice");
        expect(body.body).toContain("10 DOT");
        expect(body.body).toContain("great work!");
        return true;
      })
      .reply(200);

    await probot.receive({ name: "issue_comment", payload: tipCommentPayload });

    expect(mock.pendingMocks()).toStrictEqual([]);
  });

  test("rejects tip from unauthorized user", async () => {
    const unauthorizedPayload = {
      ...tipCommentPayload,
      comment: {
        ...tipCommentPayload.comment,
        user: { login: "unauthorized", type: "User" },
      }
    };

    const mock = nock("https://api.github.com")
      .post("/app/installations/2/access_tokens")
      .reply(200, { token: "test", permissions: { issues: "write" } })
      // Mock team membership check failure
      .get("/orgs/fluffylabs/teams/core-team")
      .reply(200, { slug: "core-team" })
      .get("/orgs/fluffylabs/teams/core-team/memberships/unauthorized")
      .reply(404)
      // Expect error comment
      .post("/repos/hiimbex/testing-things/issues/1/comments", (body: { body: string }) => {
        expect(body.body).toContain("❌");
        expect(body.body).toContain("Authorization failed");
        return true;
      })
      .reply(200);

    await probot.receive({ name: "issue_comment", payload: unauthorizedPayload });

    expect(mock.pendingMocks()).toStrictEqual([]);
  });

  test("rejects invalid tip command", async () => {
    const invalidTipPayload = {
      ...tipCommentPayload,
      comment: {
        ...tipCommentPayload.comment,
        body: "@fluffylabs-bot tip invalid-address 10 DOT"
      }
    };

    const mock = nock("https://api.github.com")
      .post("/app/installations/2/access_tokens")
      .reply(200, { token: "test", permissions: { issues: "write" } })
      // Expect error comment for invalid address
      .post("/repos/hiimbex/testing-things/issues/1/comments", (body: { body: string }) => {
        expect(body.body).toContain("❌");
        expect(body.body).toContain("Invalid tip command");
        return true;
      })
      .reply(200);

    await probot.receive({ name: "issue_comment", payload: invalidTipPayload });

    expect(mock.pendingMocks()).toStrictEqual([]);
  });

  test("ignores non-tip comments", async () => {
    const regularCommentPayload = {
      ...tipCommentPayload,
      comment: {
        ...tipCommentPayload.comment,
        body: "This is just a regular comment without any bot mention"
      }
    };

    // No API calls should be made for non-tip comments
    const mock = nock("https://api.github.com");

    await probot.receive({ name: "issue_comment", payload: regularCommentPayload });

    // Verify no API calls were made
    expect(mock.pendingMocks()).toStrictEqual([]);
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });
});