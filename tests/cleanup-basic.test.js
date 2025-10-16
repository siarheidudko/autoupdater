"use strict";

const { test, describe } = require("node:test");
const assert = require("node:assert");

const { main, CleanupService } = require("../src/services/cleanup-service.js");

describe("Cleanup Service (Basic Tests)", () => {
  test("should export CleanupService", () => {
    assert.ok(CleanupService);
    assert.ok(typeof CleanupService.killProcess === "function");
    assert.ok(typeof CleanupService.removeDirectory === "function");
    assert.ok(typeof CleanupService.runCleanup === "function");
  });

  test("should export main function", () => {
    assert.ok(main);
    assert.ok(typeof main === "function");
  });

  test("should handle empty PID gracefully", async () => {
    const result = await CleanupService.killProcess("");
    assert.strictEqual(result, true);
  });

  test("should handle empty directory path gracefully", () => {
    // Should not throw
    assert.doesNotThrow(() => {
      CleanupService.removeDirectory("");
    });
  });
});
