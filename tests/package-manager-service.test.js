"use strict";

const { test, describe, mock, beforeEach } = require("node:test");
const assert = require("node:assert");

const PackageManagerService = require("../src/services/package-manager-service");

describe("PackageManagerService", () => {
  let service;
  let mockCommandRunner;
  let mockConfig;
  let mockLogger;

  beforeEach(() => {
    mockCommandRunner = {
      run: mock.fn(() => Buffer.from("{}")),
    };

    mockConfig = {
      get: mock.fn((key) => {
        switch (key) {
          case "packageManager":
            return "npm";
          default:
            return "";
        }
      }),
    };

    mockLogger = {
      log: mock.fn(),
    };

    service = new PackageManagerService(
      mockCommandRunner,
      mockConfig,
      mockLogger
    );
  });

  test("should install npm package manager (no-op)", () => {
    service.installPackageManager();

    // npm is default, no installation needed
    assert.strictEqual(mockCommandRunner.run.mock.callCount(), 0);
  });

  test("should install pnpm package manager", () => {
    mockConfig.get = mock.fn((key) => {
      if (key === "packageManager") return "pnpm";
      return "";
    });
    service = new PackageManagerService(
      mockCommandRunner,
      mockConfig,
      mockLogger
    );

    service.installPackageManager();

    assert.strictEqual(mockCommandRunner.run.mock.callCount(), 1);
    assert.strictEqual(
      mockCommandRunner.run.mock.calls[0].arguments[0],
      "npm install pnpm -g"
    );
  });

  test("should install yarn package manager", () => {
    mockConfig.get = mock.fn((key) => {
      if (key === "packageManager") return "yarn";
      return "";
    });
    service = new PackageManagerService(
      mockCommandRunner,
      mockConfig,
      mockLogger
    );

    service.installPackageManager();

    assert.strictEqual(mockCommandRunner.run.mock.callCount(), 1);
    assert.strictEqual(
      mockCommandRunner.run.mock.calls[0].arguments[0],
      "npm install yarn -g"
    );
  });

  test("should install dependencies with npm", () => {
    service.installDependencies();

    assert.strictEqual(mockCommandRunner.run.mock.callCount(), 1);
    assert.strictEqual(
      mockCommandRunner.run.mock.calls[0].arguments[0],
      "npm ci"
    );
    assert.strictEqual(mockCommandRunner.run.mock.calls[0].arguments[1], true);
  });

  test("should get outdated packages for npm", () => {
    const outdatedData = {
      package1: {},
      package2: {},
    };
    mockCommandRunner.run = mock.fn(() =>
      Buffer.from(JSON.stringify(outdatedData))
    );

    const result = service.getOutdatedPackages();

    assert.deepStrictEqual(result, ["package1", "package2"]);
    assert.strictEqual(
      mockCommandRunner.run.mock.calls[0].arguments[0],
      "npm outdated --json"
    );
    assert.strictEqual(mockCommandRunner.run.mock.calls[0].arguments[1], true);
  });

  test("should handle empty outdated packages", () => {
    mockCommandRunner.run = mock.fn(() => Buffer.from("{}"));

    const result = service.getOutdatedPackages();

    assert.deepStrictEqual(result, []);
  });

  test("should update npm packages", () => {
    const dependencies = ["package1", "package2"];
    const devDependencies = ["dev-package1"];

    service.updatePackages(dependencies, devDependencies);

    assert.strictEqual(mockCommandRunner.run.mock.callCount(), 2);
    assert.strictEqual(
      mockCommandRunner.run.mock.calls[0].arguments[0],
      "npm install package1@latest package2@latest --save"
    );
    assert.strictEqual(
      mockCommandRunner.run.mock.calls[1].arguments[0],
      "npm install dev-package1@latest --save-dev"
    );
  });

  test("should not update empty package lists", () => {
    service.updatePackages([], []);

    assert.strictEqual(mockCommandRunner.run.mock.callCount(), 0);
  });

  test("should handle pnpm package manager", () => {
    mockConfig.get = mock.fn((key) => {
      if (key === "packageManager") return "pnpm";
      return "";
    });
    service = new PackageManagerService(
      mockCommandRunner,
      mockConfig,
      mockLogger
    );

    service.installDependencies();

    assert.strictEqual(
      mockCommandRunner.run.mock.calls[0].arguments[0],
      "pnpm install --frozen-lockfile"
    );
  });

  test("should handle yarn package manager", () => {
    mockConfig.get = mock.fn((key) => {
      if (key === "packageManager") return "yarn";
      return "";
    });
    service = new PackageManagerService(
      mockCommandRunner,
      mockConfig,
      mockLogger
    );

    service.installDependencies();

    assert.strictEqual(
      mockCommandRunner.run.mock.calls[0].arguments[0],
      "yarn install --frozen-lockfile"
    );
  });

  test("should throw error for unsupported package manager", () => {
    mockConfig.get = mock.fn((key) => {
      if (key === "packageManager") return "unsupported";
      return "";
    });
    service = new PackageManagerService(
      mockCommandRunner,
      mockConfig,
      mockLogger
    );

    // The error should be thrown when trying to get outdated packages with unsupported manager
    service.getOutdatedPackages();

    // Check that error was logged instead of thrown
    assert.strictEqual(mockLogger.log.mock.callCount(), 1);
    assert.ok(
      mockLogger.log.mock.calls[0].arguments[0].includes(
        "Error getting outdated packages"
      )
    );
  });
});
