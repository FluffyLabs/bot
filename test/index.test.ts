import nock from "nock";
import myProbotApp from "../src/index.js";
import { Probot, ProbotOctokit } from "probot";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { describe, beforeEach, afterEach, test, expect, vi } from "vitest";


const __dirname = path.dirname(fileURLToPath(import.meta.url));

const privateKey = fs.readFileSync(
  path.join(__dirname, "fixtures/mock-cert.pem"),
  "utf-8",
);

// Mock the blockchain service
vi.mock("../src/tipping/blockchain.js", () => ({
  getBlockchainService: vi.fn(() => ({
    sendTip: vi.fn().mockResolvedValue({
      success: true,
      transactionHash: "0x1234567890abcdef",
      blockHash: "0xabcdef1234567890",
      explorerUrl: "https://assethub-polkadot.subscan.io/extrinsic/0x1234567890abcdef",
    }),
    checkBalance: vi.fn().mockResolvedValue({
      dotBalance: BigInt(1000 * 10_000_000_000), // 1000 DOT - sufficient balance
      usdcBalance: BigInt(5000 * 1_000_000), // 5000 USDC - sufficient balance  
      success: true,
    }),
    disconnect: vi.fn().mockResolvedValue(undefined),
  })),
  checkBalanceWarnings: vi.fn().mockReturnValue([]), // No warnings for sufficient balance
  disconnectBlockchain: vi.fn().mockResolvedValue(undefined),
}));

const tipCommentPayload = {
  action: "created",
  issue: {
    number: 1,
    user: {
      login: "hiimbex",
      id: 1,
      node_id: "MDQ6VXNlcjE=",
      avatar_url: "https://github.com/images/error/hiimbex_happy.gif",
      gravatar_id: "",
      url: "https://api.github.com/users/hiimbex",
      html_url: "https://github.com/hiimbex",
      followers_url: "https://api.github.com/users/hiimbex/followers",
      following_url: "https://api.github.com/users/hiimbex/following{/other_user}",
      gists_url: "https://api.github.com/users/hiimbex/gists{/gist_id}",
      starred_url: "https://api.github.com/users/hiimbex/starred{/owner}{/repo}",
      subscriptions_url: "https://api.github.com/users/hiimbex/subscriptions",
      organizations_url: "https://api.github.com/users/hiimbex/orgs",
      repos_url: "https://api.github.com/users/hiimbex/repos",
      events_url: "https://api.github.com/users/hiimbex/events{/privacy}",
      received_events_url: "https://api.github.com/users/hiimbex/received_events",
      type: "User",
      site_admin: false,
    },
    id: 1,
    node_id: "MDU6SXNzdWUx",
    url: "https://api.github.com/repos/hiimbex/testing-things/issues/1",
    repository_url: "https://api.github.com/repos/hiimbex/testing-things",
    labels_url: "https://api.github.com/repos/hiimbex/testing-things/issues/1/labels{/name}",
    comments_url: "https://api.github.com/repos/hiimbex/testing-things/issues/1/comments",
    events_url: "https://api.github.com/repos/hiimbex/testing-things/issues/1/events",
    html_url: "https://github.com/hiimbex/testing-things/issues/1",
    title: "Test Issue",
    body: "Test issue body",
    state: "open",
    locked: false,
    assignee: null,
    assignees: [],
    milestone: null,
    comments: 0,
    created_at: "2023-01-01T00:00:00Z",
    updated_at: "2023-01-01T00:00:00Z",
    closed_at: null,
    author_association: "OWNER",
    active_lock_reason: null,
    draft: false,
    pull_request: undefined,
    labels: [],
    reactions: {
      url: "https://api.github.com/repos/hiimbex/testing-things/issues/1/reactions",
      total_count: 0,
      "+1": 0,
      "-1": 0,
      laugh: 0,
      hooray: 0,
      confused: 0,
      heart: 0,
      rocket: 0,
      eyes: 0,
    },
    timeline_url: "https://api.github.com/repos/hiimbex/testing-things/issues/1/timeline",
    performed_via_github_app: null,
    state_reason: null,
  },
  comment: {
    id: 1,
    node_id: "MDEyOklzc3VlQ29tbWVudDE=",
    url: "https://api.github.com/repos/hiimbex/testing-things/issues/comments/1",
    html_url: "https://github.com/hiimbex/testing-things/issues/1#issuecomment-1",
    user: {
      login: "alice",
      id: 1,
      node_id: "MDQ6VXNlcjE=",
      avatar_url: "https://github.com/images/error/alice_happy.gif",
      gravatar_id: "",
      url: "https://api.github.com/users/alice",
      html_url: "https://github.com/alice",
      followers_url: "https://api.github.com/users/alice/followers",
      following_url: "https://api.github.com/users/alice/following{/other_user}",
      gists_url: "https://api.github.com/users/alice/gists{/gist_id}",
      starred_url: "https://api.github.com/users/alice/starred{/owner}{/repo}",
      subscriptions_url: "https://api.github.com/users/alice/subscriptions",
      organizations_url: "https://api.github.com/users/alice/orgs",
      repos_url: "https://api.github.com/users/alice/repos",
      events_url: "https://api.github.com/users/alice/events{/privacy}",
      received_events_url: "https://api.github.com/users/alice/received_events",
      type: "User",
      site_admin: false,
    },
    created_at: "2023-01-01T00:00:00Z",
    updated_at: "2023-01-01T00:00:00Z",
    author_association: "COLLABORATOR",
    body: "@fluffylabs-bot tip 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY 10 DOT great work!",
    reactions: {
      url: "https://api.github.com/repos/hiimbex/testing-things/issues/comments/1/reactions",
      total_count: 0,
      "+1": 0,
      "-1": 0,
      laugh: 0,
      hooray: 0,
      confused: 0,
      heart: 0,
      rocket: 0,
      eyes: 0,
    },
    performed_via_github_app: null,
    issue_url: "https://api.github.com/repos/hiimbex/testing-things/issues/1",
  },
  repository: {
    id: 1,
    node_id: "MDEwOlJlcG9zaXRvcnkx",
    name: "testing-things",
    full_name: "hiimbex/testing-things",
    private: false,
    owner: {
      login: "hiimbex",
      id: 1,
      node_id: "MDQ6VXNlcjE=",
      avatar_url: "https://github.com/images/error/hiimbex_happy.gif",
      gravatar_id: "",
      url: "https://api.github.com/users/hiimbex",
      html_url: "https://github.com/hiimbex",
      followers_url: "https://api.github.com/users/hiimbex/followers",
      following_url: "https://api.github.com/users/hiimbex/following{/other_user}",
      gists_url: "https://api.github.com/users/hiimbex/gists{/gist_id}",
      starred_url: "https://api.github.com/users/hiimbex/starred{/owner}{/repo}",
      subscriptions_url: "https://api.github.com/users/hiimbex/subscriptions",
      organizations_url: "https://api.github.com/users/hiimbex/orgs",
      repos_url: "https://api.github.com/users/hiimbex/repos",
      events_url: "https://api.github.com/users/hiimbex/events{/privacy}",
      received_events_url: "https://api.github.com/users/hiimbex/received_events",
      type: "User",
      site_admin: false,
    },
    html_url: "https://github.com/hiimbex/testing-things",
    description: null,
    fork: false,
    url: "https://api.github.com/repos/hiimbex/testing-things",
    archive_url: "https://api.github.com/repos/hiimbex/testing-things/{archive_format}{/ref}",
    assignees_url: "https://api.github.com/repos/hiimbex/testing-things/assignees{/user}",
    blobs_url: "https://api.github.com/repos/hiimbex/testing-things/git/blobs{/sha}",
    branches_url: "https://api.github.com/repos/hiimbex/testing-things/branches{/branch}",
    collaborators_url: "https://api.github.com/repos/hiimbex/testing-things/collaborators{/collaborator}",
    comments_url: "https://api.github.com/repos/hiimbex/testing-things/comments{/number}",
    commits_url: "https://api.github.com/repos/hiimbex/testing-things/commits{/sha}",
    compare_url: "https://api.github.com/repos/hiimbex/testing-things/compare/{base}...{head}",
    contents_url: "https://api.github.com/repos/hiimbex/testing-things/contents/{+path}",
    contributors_url: "https://api.github.com/repos/hiimbex/testing-things/contributors",
    deployments_url: "https://api.github.com/repos/hiimbex/testing-things/deployments",
    downloads_url: "https://api.github.com/repos/hiimbex/testing-things/downloads",
    events_url: "https://api.github.com/repos/hiimbex/testing-things/events",
    forks_url: "https://api.github.com/repos/hiimbex/testing-things/forks",
    git_commits_url: "https://api.github.com/repos/hiimbex/testing-things/git/commits{/sha}",
    git_refs_url: "https://api.github.com/repos/hiimbex/testing-things/git/refs{/sha}",
    git_tags_url: "https://api.github.com/repos/hiimbex/testing-things/git/tags{/sha}",
    git_url: "git:github.com/hiimbex/testing-things.git",
    issue_comment_url: "https://api.github.com/repos/hiimbex/testing-things/issues/comments{/number}",
    issue_events_url: "https://api.github.com/repos/hiimbex/testing-things/issues/events{/number}",
    issues_url: "https://api.github.com/repos/hiimbex/testing-things/issues{/number}",
    keys_url: "https://api.github.com/repos/hiimbex/testing-things/keys{/key_id}",
    labels_url: "https://api.github.com/repos/hiimbex/testing-things/labels{/name}",
    languages_url: "https://api.github.com/repos/hiimbex/testing-things/languages",
    merges_url: "https://api.github.com/repos/hiimbex/testing-things/merges",
    milestones_url: "https://api.github.com/repos/hiimbex/testing-things/milestones{/number}",
    notifications_url: "https://api.github.com/repos/hiimbex/testing-things/notifications{?since,all,participating}",
    pulls_url: "https://api.github.com/repos/hiimbex/testing-things/pulls{/number}",
    releases_url: "https://api.github.com/repos/hiimbex/testing-things/releases{/id}",
    ssh_url: "git@github.com:hiimbex/testing-things.git",
    stargazers_url: "https://api.github.com/repos/hiimbex/testing-things/stargazers",
    statuses_url: "https://api.github.com/repos/hiimbex/testing-things/statuses/{sha}",
    subscribers_url: "https://api.github.com/repos/hiimbex/testing-things/subscribers",
    subscription_url: "https://api.github.com/repos/hiimbex/testing-things/subscription",
    tags_url: "https://api.github.com/repos/hiimbex/testing-things/tags",
    teams_url: "https://api.github.com/repos/hiimbex/testing-things/teams",
    trees_url: "https://api.github.com/repos/hiimbex/testing-things/git/trees{/sha}",
    clone_url: "https://github.com/hiimbex/testing-things.git",
    mirror_url: null,
    hooks_url: "https://api.github.com/repos/hiimbex/testing-things/hooks",
    svn_url: "https://github.com/hiimbex/testing-things",
    homepage: null,
    language: null,
    forks_count: 0,
    stargazers_count: 0,
    watchers_count: 0,
    size: 0,
    default_branch: "main",
    open_issues_count: 1,
    is_template: false,
    topics: [],
    has_issues: true,
    has_projects: true,
    has_wiki: true,
    has_pages: false,
    has_downloads: true,
    archived: false,
    disabled: false,
    visibility: "public",
    pushed_at: "2023-01-01T00:00:00Z",
    created_at: "2023-01-01T00:00:00Z",
    updated_at: "2023-01-01T00:00:00Z",
    permissions: {
      admin: true,
      maintain: true,
      push: true,
      triage: true,
      pull: true,
    },
    allow_rebase_merge: true,
    temp_clone_token: "",
    allow_squash_merge: true,
    allow_auto_merge: false,
    delete_branch_on_merge: false,
    allow_merge_commit: true,
    subscribers_count: 0,
    network_count: 0,
    license: null,
    forks: 0,
    open_issues: 1,
    watchers: 0,
  },
  installation: {
    id: 2,
    node_id: "MDIzOkludGVncmF0aW9uSW5zdGFsbGF0aW9uMg==",
  },
  sender: {
    login: "alice",
    id: 1,
    node_id: "MDQ6VXNlcjE=",
    avatar_url: "https://github.com/images/error/alice_happy.gif",
    gravatar_id: "",
    url: "https://api.github.com/users/alice",
    html_url: "https://github.com/alice",
    followers_url: "https://api.github.com/users/alice/followers",
    following_url: "https://api.github.com/users/alice/following{/other_user}",
    gists_url: "https://api.github.com/users/alice/gists{/gist_id}",
    starred_url: "https://api.github.com/users/alice/starred{/owner}{/repo}",
    subscriptions_url: "https://api.github.com/users/alice/subscriptions",
    organizations_url: "https://api.github.com/users/alice/orgs",
    repos_url: "https://api.github.com/users/alice/repos",
    events_url: "https://api.github.com/users/alice/events{/privacy}",
    received_events_url: "https://api.github.com/users/alice/received_events",
    type: "User",
    site_admin: false,
  },
};

describe("Tipping Bot E2E", () => {
  let probot: Probot;

  beforeEach(() => {
    nock.disableNetConnect();
    
    // Set up environment variables for the test
    process.env.GITHUB_ORG = "fluffylabs";
    process.env.GITHUB_TEAM = "core-team";
    process.env.WALLET_SEED = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
    process.env.MAX_DOT_TIP = "100";
    process.env.MAX_USDC_TIP = "1000";
    process.env.ASSET_HUB_RPC = "wss://test-rpc.example.com";
    
    // Reset all mocks
    vi.clearAllMocks();
    
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
      .get("/orgs/fluffylabs/teams/core-team/memberships/alice")
      .reply(200, { state: "active" })
      // Expect eyes reaction for authorized user
      .post("/repos/hiimbex/testing-things/issues/comments/1/reactions", (body: any) => {
        expect(body.content).toBe("eyes");
        return true;
      })
      .reply(200)
      // Expect processing comment
      .post(
        "/repos/hiimbex/testing-things/issues/1/comments",
        (body: { body: string }) => {
          expect(body.body).toContain("⏳ **Processing tip**");
          expect(body.body).toContain("@alice");
          expect(body.body).toContain("10 DOT");
          expect(body.body).toContain("great work!");
          return true;
        },
      )
      .reply(200, { id: 123 })
      // Expect comment update with success after transaction
      .patch(
        "/repos/hiimbex/testing-things/issues/comments/123",
        (body: { body: string }) => {
          expect(body.body).toContain("✅ **Tip sent successfully!**");
          expect(body.body).toContain("@alice");
          expect(body.body).toContain("10 DOT");
          expect(body.body).toContain("0x1234567890abcdef");
          return true;
        },
      )
      .reply(200);

    await probot.receive({ name: "issue_comment", payload: tipCommentPayload, id: "12345" } as any);

    expect(mock.pendingMocks()).toStrictEqual([]);
  });

  test("rejects tip from unauthorized user", async () => {
    const unauthorizedPayload = {
      ...tipCommentPayload,
      comment: {
        ...tipCommentPayload.comment,
        user: {
          ...tipCommentPayload.comment.user,
          login: "unauthorized",
        },
      },
      sender: {
        ...tipCommentPayload.sender,
        login: "unauthorized",
      },
    };

    const mock = nock("https://api.github.com")
      .post("/app/installations/2/access_tokens")
      .reply(200, { token: "test", permissions: { issues: "write" } })
      // Mock team membership check failure
      .get("/orgs/fluffylabs/teams/core-team/memberships/unauthorized")
      .reply(404)
      // Mock organization membership check failure (fallback)
      .get("/orgs/fluffylabs/memberships/unauthorized")
      .reply(404)
      // Expect thumbsdown reaction for unauthorized user
      .post("/repos/hiimbex/testing-things/issues/comments/1/reactions", (body: any) => {
        expect(body.content).toBe("-1");
        return true;
      })
      .reply(200);

    await probot.receive({
      name: "issue_comment",
      payload: unauthorizedPayload,
      id: "12346",
    } as any);

    expect(mock.pendingMocks()).toStrictEqual([]);
  });

  test("rejects invalid tip command", async () => {
    const invalidTipPayload = {
      ...tipCommentPayload,
      comment: {
        ...tipCommentPayload.comment,
        body: "@fluffylabs-bot tip invalid-address 10 DOT",
      },
    };

    const mock = nock("https://api.github.com")
      .post("/app/installations/2/access_tokens")
      .reply(200, { token: "test", permissions: { issues: "write" } })
      // Mock team membership check (user is authorized)
      .get("/orgs/fluffylabs/teams/core-team/memberships/alice") 
      .reply(200, { state: "active" })
      // Expect eyes reaction for authorized user first
      .post("/repos/hiimbex/testing-things/issues/comments/1/reactions", (body: any) => {
        expect(body.content).toBe("eyes");
        return true;
      })
      .reply(200)
      // Expect error comment for invalid address (to authorized user)
      .post(
        "/repos/hiimbex/testing-things/issues/1/comments",
        (body: { body: string }) => {
          expect(body.body).toContain("❌");
          expect(body.body).toContain("Invalid tip command");
          return true;
        },
      )
      .reply(200);

    await probot.receive({ name: "issue_comment", payload: invalidTipPayload, id: "12347" } as any);

    expect(mock.pendingMocks()).toStrictEqual([]);
  });

  test("ignores non-tip comments", async () => {
    const regularCommentPayload = {
      ...tipCommentPayload,
      comment: {
        ...tipCommentPayload.comment,
        body: "This is just a regular comment without any bot mention",
      },
    };

    // No API calls should be made for non-tip comments
    const mock = nock("https://api.github.com");

    await probot.receive({
      name: "issue_comment",
      payload: regularCommentPayload,
      id: "12348",
    } as any);

    // Verify no API calls were made
    expect(mock.pendingMocks()).toStrictEqual([]);
  });

  test("handles balance check after successful tip", async () => {
    const mock = nock("https://api.github.com")
      .post("/app/installations/2/access_tokens")
      .reply(200, { token: "test", permissions: { issues: "write" } })
      .get("/orgs/fluffylabs/teams/core-team/memberships/alice")
      .reply(200, { state: "active" })
      .post("/repos/hiimbex/testing-things/issues/comments/1/reactions")
      .reply(200)
      .post("/repos/hiimbex/testing-things/issues/1/comments")
      .reply(200, { id: 123 })
      .patch("/repos/hiimbex/testing-things/issues/comments/123")
      .reply(200);

    await probot.receive({ name: "issue_comment", payload: tipCommentPayload, id: "12349" } as any);

    expect(mock.pendingMocks()).toStrictEqual([]);
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
    
    // Clean up environment variables
    delete process.env.GITHUB_ORG;
    delete process.env.GITHUB_TEAM;
    delete process.env.WALLET_SEED;
    delete process.env.MAX_DOT_TIP;
    delete process.env.MAX_USDC_TIP;
    delete process.env.ASSET_HUB_RPC;
  });
});
