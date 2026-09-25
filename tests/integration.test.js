import { test, describe } from "node:test";
import assert from "node:assert";
import Config from "../src/config/config.js";
import Logger from "../src/utils/logger.js";
import FileSystem from "../src/utils/file-system.js";
import AutoUpdater from "../src/autoupdater.js";
import { AppFactory } from "../src/index.js";
import fs from "fs";
import path from "path";
import core from "../src/utils/actions-core.js";

// Simple integration test to check basic functionality
describe("Basic Integration", () => {
  test("should load all modules without errors", () => {
    // Test that all main modules can be loaded

    assert.ok(Config);
    assert.ok(Logger);
    assert.ok(FileSystem);
    assert.ok(AutoUpdater);
    assert.ok(AppFactory);
  });

  test("should create basic file operations", () => {
    const testFile = path.join(import.meta.dirname, "temp-test.json");

    // Clean up first
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
    }

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

    // Mock core functions for this test
    const originalGetInput = core.getInput;
    const originalGetMultilineInput = core.getMultilineInput;

    core.getInput = (key) => {
      if (key === "package-manager") return "npm";
      return "";
    };
    core.getMultilineInput = () => [];

    try {
      const config = new Config();
      assert.strictEqual(config.get("packageManager"), "npm");
    } finally {
      // Restore original functions
      core.getInput = originalGetInput;
      core.getMultilineInput = originalGetMultilineInput;
    }
  });
});
