"use strict";

const { test, describe, mock, beforeEach } = require("node:test");
const assert = require("node:assert");

const Logger = require("../src/utils/logger");

describe("Logger", () => {
  let mockCore;
  let logger;
  let mockConfig;

  beforeEach(() => {
    mockCore = {
      info: mock.fn(),
      error: mock.fn(),
      setFailed: mock.fn(),
    };

    // Mock @actions/core module
    mock.method(require("@actions/core"), "info", mockCore.info);
    mock.method(require("@actions/core"), "error", mockCore.error);
    mock.method(require("@actions/core"), "setFailed", mockCore.setFailed);

    mockConfig = {
      isDebugEnabled: mock.fn(() => false),
    };

    logger = new Logger(mockConfig);
  });

  test("should log info messages", () => {
    logger.info("test message");

    assert.strictEqual(mockCore.info.mock.callCount(), 1);
    assert.strictEqual(
      mockCore.info.mock.calls[0].arguments[0],
      "test message"
    );
  });

  test("should log error messages", () => {
    logger.error("test error");

    assert.strictEqual(mockCore.error.mock.callCount(), 1);
    assert.strictEqual(mockCore.error.mock.calls[0].arguments[0], "test error");
  });

  test("should set failed status", () => {
    logger.setFailed("test failure");

    assert.strictEqual(mockCore.setFailed.mock.callCount(), 1);
    assert.strictEqual(
      mockCore.setFailed.mock.calls[0].arguments[0],
      "test failure"
    );
  });

  test("should log debug messages when debug is enabled", () => {
    mockConfig.isDebugEnabled = mock.fn(() => true);
    logger = new Logger(mockConfig);

    logger.log("debug message");

    assert.strictEqual(mockCore.info.mock.callCount(), 1);
    assert.ok(
      mockCore.info.mock.calls[0].arguments[0].includes("debug message")
    );
    assert.ok(
      mockCore.info.mock.calls[0].arguments[0].match(/^\d{4}-\d{2}-\d{2}T/)
    ); // ISO date format
  });

  test("should not log debug messages when debug is disabled", () => {
    mockConfig.isDebugEnabled = mock.fn(() => false);
    logger = new Logger(mockConfig);

    logger.log("debug message");

    assert.strictEqual(mockCore.info.mock.callCount(), 0);
  });
});
