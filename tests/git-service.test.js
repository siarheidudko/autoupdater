"use strict";

const { test, describe, mock, beforeEach } = require("node:test");
const assert = require("node:assert");

const GitService = require("../src/services/git-service");

describe("GitService", () => {
  let service;
  let mockCommandRunner;
  let mockConfig;
  let mockLogger;

  beforeEach(() => {
    mockCommandRunner = {
      run: mock.fn(),
    };

    mockConfig = {
      get: mock.fn((key) => {
        switch (key) {
          case "workingDirectory":
            return "/test/dir";
          case "token":
            return "test-token";
          case "ref":
            return "owner/repo";
          case "authorEmail":
            return "test@example.com";
          case "authorName":
            return "Test Author";
          case "branch":
            return "main";
          default:
            return "";
        }
      }),
    };

    mockLogger = {
      log: mock.fn(),
    };

    service = new GitService(mockCommandRunner, mockConfig, mockLogger);
  });

  test("should commit changes", () => {
    service.commit("dependencies");

    assert.strictEqual(mockCommandRunner.run.mock.callCount(), 2);
    assert.strictEqual(
      mockCommandRunner.run.mock.calls[0].arguments[0],
      "git add --all"
    );
    assert.strictEqual(
      mockCommandRunner.run.mock.calls[1].arguments[0],
      'git commit -m "dependencies"'
    );
  });

  test("should push branch and tags without major version tag", () => {
    service.push();

    assert.strictEqual(mockCommandRunner.run.mock.callCount(), 2);
    assert.strictEqual(
      mockCommandRunner.run.mock.calls[0].arguments[0],
      "git push autoupdater main"
    );
    assert.strictEqual(
      mockCommandRunner.run.mock.calls[1].arguments[0],
      "git push autoupdater --tags"
    );
  });

  test("should push branch, tags, and force-push major version tag", () => {
    service.push("v6");

    assert.strictEqual(mockCommandRunner.run.mock.callCount(), 3);
    assert.strictEqual(
      mockCommandRunner.run.mock.calls[0].arguments[0],
      "git push autoupdater main"
    );
    assert.strictEqual(
      mockCommandRunner.run.mock.calls[1].arguments[0],
      "git push autoupdater --tags"
    );
    assert.strictEqual(
      mockCommandRunner.run.mock.calls[2].arguments[0],
      "git push autoupdater v6 --force"
    );
  });

  test("should create version tag for npm", () => {
    service.createVersionTag("npm");

    assert.strictEqual(mockCommandRunner.run.mock.callCount(), 1);
    assert.strictEqual(
      mockCommandRunner.run.mock.calls[0].arguments[0],
      "npm version patch"
    );
  });

  test("should create version tag for pnpm", () => {
    service.createVersionTag("pnpm");

    assert.strictEqual(mockCommandRunner.run.mock.callCount(), 1);
    assert.strictEqual(
      mockCommandRunner.run.mock.calls[0].arguments[0],
      "pnpm version patch"
    );
  });

  test("should create version tag for yarn", () => {
    service.createVersionTag("yarn");

    assert.strictEqual(mockCommandRunner.run.mock.callCount(), 1);
    assert.strictEqual(
      mockCommandRunner.run.mock.calls[0].arguments[0],
      "yarn version --new-version patch"
    );
  });

  test("should throw error for unsupported package manager in createVersionTag", () => {
    assert.throws(
      () => service.createVersionTag("unsupported"),
      /Unsupported package manager for versioning: unsupported/
    );
  });

  test("should create major version tag from full version string", () => {
    const result = service.createMajorVersionTag("6.0.1");

    assert.strictEqual(result, "v6");
    assert.strictEqual(mockCommandRunner.run.mock.callCount(), 1);
    assert.strictEqual(
      mockCommandRunner.run.mock.calls[0].arguments[0],
      "git tag -f v6"
    );
  });

  test("should create major version tag for version 1.x.x", () => {
    const result = service.createMajorVersionTag("1.2.3");

    assert.strictEqual(result, "v1");
    assert.strictEqual(mockCommandRunner.run.mock.callCount(), 1);
    assert.strictEqual(
      mockCommandRunner.run.mock.calls[0].arguments[0],
      "git tag -f v1"
    );
  });

  test("should handle major version tag for version 0.x.x", () => {
    const result = service.createMajorVersionTag("0.5.10");

    assert.strictEqual(result, "v0");
    assert.strictEqual(mockCommandRunner.run.mock.callCount(), 1);
    assert.strictEqual(
      mockCommandRunner.run.mock.calls[0].arguments[0],
      "git tag -f v0"
    );
  });

  test("should throw error for null version in createMajorVersionTag", () => {
    assert.throws(() => service.createMajorVersionTag(null), /Invalid version/);
  });

  test("should throw error for empty version in createMajorVersionTag", () => {
    assert.throws(() => service.createMajorVersionTag(""), /Invalid version/);
  });

  test("should setup git with token-authenticated remote URL", () => {
    service.setupGit();

    assert.strictEqual(mockCommandRunner.run.mock.callCount(), 3);
    assert.ok(
      mockCommandRunner.run.mock.calls[0].arguments[0].includes(
        "git remote add autoupdater"
      )
    );
    assert.ok(
      mockCommandRunner.run.mock.calls[0].arguments[0].includes(
        "test-token@github.com/owner/repo.git"
      )
    );
    assert.strictEqual(
      mockCommandRunner.run.mock.calls[1].arguments[0],
      'git config --global user.email "test@example.com"'
    );
    assert.strictEqual(
      mockCommandRunner.run.mock.calls[2].arguments[0],
      'git config --global user.name "Test Author"'
    );
  });

  test("should fetch and checkout branch", () => {
    service.fetchAndCheckout();

    assert.strictEqual(mockCommandRunner.run.mock.callCount(), 2);
    assert.strictEqual(
      mockCommandRunner.run.mock.calls[0].arguments[0],
      "git fetch autoupdater"
    );
    assert.strictEqual(
      mockCommandRunner.run.mock.calls[1].arguments[0],
      "git checkout main"
    );
  });
});
