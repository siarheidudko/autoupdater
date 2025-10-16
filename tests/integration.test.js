"use strict";

const { test, describe } = require("node:test");
const assert = require("node:assert");

// Simple integration test to check basic functionality
describe("Basic Integration", () => {
  test("should load all modules without errors", () => {
    // Test that all main modules can be loaded
    const Config = require("../src/config/config");
    const Logger = require("../src/utils/logger");
    const FileSystem = require("../src/utils/file-system");
    const AutoUpdater = require("../src/autoupdater");
    const { AppFactory } = require("../src/index");

    assert.ok(Config);
    assert.ok(Logger);
    assert.ok(FileSystem);
    assert.ok(AutoUpdater);
    assert.ok(AppFactory);
  });

  test("should create basic file operations", () => {
    const fs = require("fs");
    const path = require("path");
    const testFile = path.join(__dirname, "temp-test.json");

    // Clean up first
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
    }

    const FileSystem = require("../src/utils/file-system");
    const testData = { test: true, version: "1.0.0" };

    // Write and read JSON
    FileSystem.writeJsonFile(testFile, testData);
    const result = FileSystem.readJsonFile(testFile);

    assert.deepStrictEqual(result, testData);

    // Clean up
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
    }
  });

  test("should validate package managers", () => {
    const core = require("@actions/core");

    // Mock core functions for this test
    const originalGetInput = core.getInput;
    const originalGetMultilineInput = core.getMultilineInput;

    core.getInput = (key) => {
      if (key === "package-manager") return "npm";
      return "";
    };
    core.getMultilineInput = () => [];

    try {
      const Config = require("../src/config/config");
      const config = new Config();
      assert.strictEqual(config.get("packageManager"), "npm");
    } finally {
      // Restore original functions
      core.getInput = originalGetInput;
      core.getMultilineInput = originalGetMultilineInput;
    }
  });
});
