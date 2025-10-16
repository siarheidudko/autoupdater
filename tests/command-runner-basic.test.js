"use strict";

const { test, describe } = require("node:test");
const assert = require("node:assert");

const CommandRunner = require("../src/utils/command-runner.js");

describe("Command Runner (Basic Tests)", () => {
  test("should create CommandRunner instance", () => {
    const mockLogger = { log: () => {} };
    const runner = new CommandRunner(mockLogger, "/tmp");
    assert.ok(runner);
    assert.ok(typeof runner.run === "function");
  });

  test("should handle command runner with proper interface", () => {
    const mockLogger = { log: () => {} };
    const runner = new CommandRunner(mockLogger, "/tmp");

    // Test that runner has expected methods
    assert.ok(typeof runner.run === "function");
    assert.ok(typeof runner.runSequence === "function");
  });

  test("should validate constructor parameters", () => {
    // Basic validation that constructor works
    assert.doesNotThrow(() => {
      const runner = new CommandRunner({ log: () => {} }, "/tmp");
      assert.ok(runner);
    });
  });
});
