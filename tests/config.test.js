"use strict";

const { test, describe, mock, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert");

const Config = require("../src/config/config");

describe("Config", () => {
  let originalGetInput;
  let originalEnv;

  beforeEach(() => {
    // Mock @actions/core
    originalGetInput = mock.fn();
    originalEnv = { ...process.env };

    // Reset environment
    delete process.env.GITHUB_TOKEN;
    delete process.env.GITHUB_REPOSITORY;
    delete process.env.GITHUB_WORKSPACE;
  });

  afterEach(() => {
    // Restore environment
    process.env = originalEnv;
    mock.restoreAll();
  });

  test("should load default configuration", () => {
    // Mock core.getInput to return empty strings (defaults)
    const core = require("@actions/core");
    mock.method(core, "getInput", () => "");
    mock.method(core, "getMultilineInput", () => []);

    const config = new Config();

    assert.strictEqual(config.get("authorEmail"), "actions@github.com");
    assert.strictEqual(config.get("authorName"), "GitHUB Actions");
    assert.strictEqual(config.get("branch"), "master");
    assert.strictEqual(config.get("packageManager"), "npm");
    assert.strictEqual(config.get("debug"), false);
    assert.deepStrictEqual(config.get("buildsAndChecks"), []);
    assert.deepStrictEqual(config.get("ignorePackages"), []);
  });

  test("should load configuration from inputs", () => {
    const core = require("@actions/core");
    const inputValues = {
      token: "test-token",
      "author-email": "test@example.com",
      "author-name": "Test Author",
      ref: "owner/repo",
      branch: "main",
      "package-manager": "yarn",
      debug: "true",
    };

    mock.method(core, "getInput", (key) => inputValues[key] || "");
    mock.method(core, "getMultilineInput", () => []);

    const config = new Config();

    assert.strictEqual(config.get("token"), "test-token");
    assert.strictEqual(config.get("authorEmail"), "test@example.com");
    assert.strictEqual(config.get("authorName"), "Test Author");
    assert.strictEqual(config.get("ref"), "owner/repo");
    assert.strictEqual(config.get("branch"), "main");
    assert.strictEqual(config.get("packageManager"), "yarn");
    assert.strictEqual(config.get("debug"), true);
  });

  test("should validate package manager", () => {
    const core = require("@actions/core");
    mock.method(core, "getInput", (key) => {
      if (key === "package-manager") return "invalid-manager";
      return "";
    });
    mock.method(core, "getMultilineInput", () => []);

    assert.throws(
      () => new Config(),
      /Invalid package manager: invalid-manager/
    );
  });

  test("should use environment variables as fallback", () => {
    process.env.GITHUB_TOKEN = "env-token";
    process.env.GITHUB_REPOSITORY = "env-owner/env-repo";
    process.env.GITHUB_WORKSPACE = "/env/workspace";

    const core = require("@actions/core");
    mock.method(core, "getInput", () => "");
    mock.method(core, "getMultilineInput", () => []);

    const config = new Config();

    assert.strictEqual(config.get("token"), "env-token");
    assert.strictEqual(config.get("ref"), "env-owner/env-repo");
    assert.strictEqual(config.get("workingDirectory"), "/env/workspace");
  });

  test("should freeze configuration", () => {
    const core = require("@actions/core");
    mock.method(core, "getInput", () => "");
    mock.method(core, "getMultilineInput", () => []);

    const config = new Config();

    // Try to modify the internal config object directly (this should be prevented)
    assert.throws(() => {
      config._config.newProperty = "test";
    }, /Cannot add property/);
  });

  test("should check debug mode correctly", () => {
    const core = require("@actions/core");
    mock.method(core, "getInput", (key) => {
      if (key === "debug") return "true";
      return "";
    });
    mock.method(core, "getMultilineInput", () => []);

    const config = new Config();

    assert.strictEqual(config.isDebugEnabled(), true);
  });
});
