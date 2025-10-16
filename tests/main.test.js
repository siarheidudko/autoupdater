"use strict";

const { test, describe, mock, beforeEach, after } = require("node:test");
const assert = require("node:assert");

const { main, AppFactory } = require("../src/index");

describe("Main Application", () => {
  let mockCore;
  let originalExit;

  beforeEach(() => {
    mockCore = {
      saveState: mock.fn(),
      setOutput: mock.fn(),
      error: mock.fn(),
      setFailed: mock.fn(),
    };

    // Mock @actions/core
    Object.keys(mockCore).forEach((method) => {
      mock.method(require("@actions/core"), method, mockCore[method]);
    });

    // Mock process.exit to prevent actual exit during tests
    originalExit = process.exit;
    process.exit = mock.fn();
  });

  after(() => {
    process.exit = originalExit;
    mock.restoreAll();
  });

  test("should create services correctly", () => {
    // Mock required modules
    mock.method(require("../src/config/config").prototype, "get", (key) => {
      switch (key) {
        case "workingDirectory":
          return "/test/dir";
        default:
          return "default-value";
      }
    });

    mock.method(
      require("../src/config/config").prototype,
      "isDebugEnabled",
      () => false
    );

    const services = AppFactory.createServices();

    assert.ok(services.config);
    assert.ok(services.logger);
    assert.ok(services.autoUpdater);
    assert.strictEqual(services.workingDirectory, "/test/dir");
  });

  test("should handle successful autoupdate", async () => {
    const mockResult = {
      updated: true,
      version: "1.0.1",
      updatedPackages: ["package1", "package2"],
    };

    // Mock services
    const mockServices = {
      config: { get: mock.fn() },
      logger: { info: mock.fn(), error: mock.fn(), setFailed: mock.fn() },
      autoUpdater: { run: mock.fn(async () => mockResult) },
      workingDirectory: "/test/dir",
    };

    mock.method(AppFactory, "createServices", () => mockServices);

    const result = await main();

    assert.deepStrictEqual(result, ["package1", "package2"]);
    assert.strictEqual(mockCore.setOutput.mock.callCount(), 3);
    assert.deepStrictEqual(mockCore.setOutput.mock.calls[0].arguments, [
      "version",
      "1.0.1",
    ]);
    assert.deepStrictEqual(mockCore.setOutput.mock.calls[1].arguments, [
      "updated",
      true,
    ]);
    assert.deepStrictEqual(mockCore.setOutput.mock.calls[2].arguments, [
      "dir",
      "/test/dir",
    ]);
    assert.strictEqual(mockServices.logger.info.mock.callCount(), 1);
    assert.ok(
      mockServices.logger.info.mock.calls[0].arguments[0].includes(
        "package1, package2"
      )
    );
  });

  test("should handle no updates case", async () => {
    const mockResult = {
      updated: false,
      version: "1.0.0",
      updatedPackages: [],
    };

    const mockServices = {
      config: { get: mock.fn() },
      logger: { info: mock.fn(), error: mock.fn(), setFailed: mock.fn() },
      autoUpdater: { run: mock.fn(async () => mockResult) },
      workingDirectory: "/test/dir",
    };

    mock.method(AppFactory, "createServices", () => mockServices);

    const result = await main();

    assert.deepStrictEqual(result, []);
    assert.strictEqual(mockServices.logger.info.mock.callCount(), 1);
    assert.ok(
      mockServices.logger.info.mock.calls[0].arguments[0].includes("Completed.")
    );
  });

  test("should handle autoupdate errors", async () => {
    const testError = new Error("Autoupdate failed");

    const mockServices = {
      config: { get: mock.fn() },
      logger: { info: mock.fn(), error: mock.fn(), setFailed: mock.fn() },
      autoUpdater: {
        run: mock.fn(async () => {
          throw testError;
        }),
      },
      workingDirectory: "/test/dir",
    };

    mock.method(AppFactory, "createServices", () => mockServices);

    await assert.rejects(main(), testError);

    assert.strictEqual(mockServices.logger.error.mock.callCount(), 1);
    assert.strictEqual(mockServices.logger.setFailed.mock.callCount(), 1);
    assert.deepStrictEqual(mockServices.logger.error.mock.calls[0].arguments, [
      testError,
    ]);
  });

  test("should handle service creation errors", async () => {
    const testError = new Error("Service creation failed");

    mock.method(AppFactory, "createServices", () => {
      throw testError;
    });

    await assert.rejects(main(), testError);

    assert.strictEqual(mockCore.error.mock.callCount(), 1);
    assert.strictEqual(mockCore.setFailed.mock.callCount(), 1);
  });

  test("should save state correctly", async () => {
    const mockServices = {
      config: { get: mock.fn() },
      logger: { info: mock.fn(), error: mock.fn(), setFailed: mock.fn() },
      autoUpdater: {
        run: mock.fn(async () => ({
          updated: false,
          version: "1.0.0",
          updatedPackages: [],
        })),
      },
      workingDirectory: "/test/dir",
    };

    mock.method(AppFactory, "createServices", () => mockServices);

    await main();

    assert.strictEqual(mockCore.saveState.mock.callCount(), 2);
    assert.deepStrictEqual(mockCore.saveState.mock.calls[0].arguments, [
      "AutoUpdaterWorkDir",
      "/test/dir",
    ]);
    assert.deepStrictEqual(mockCore.saveState.mock.calls[1].arguments, [
      "AutoUpdaterPID",
      process.pid,
    ]);
  });
});
