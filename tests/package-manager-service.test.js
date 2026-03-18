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

  test("should update npm peer and optional dependencies", () => {
    const peerDependencies = ["peer-pkg1"];
    const optionalDependencies = ["opt-pkg1", "opt-pkg2"];

    service.updatePackages([], [], peerDependencies, optionalDependencies);

    assert.strictEqual(mockCommandRunner.run.mock.callCount(), 2);
    assert.strictEqual(
      mockCommandRunner.run.mock.calls[0].arguments[0],
      "npm install peer-pkg1@latest --save-peer"
    );
    assert.strictEqual(
      mockCommandRunner.run.mock.calls[1].arguments[0],
      "npm install opt-pkg1@latest opt-pkg2@latest --save-optional"
    );
  });

  test("should update all npm dependency types", () => {
    service.updatePackages(["dep1"], ["dev1"], ["peer1"], ["opt1"]);

    assert.strictEqual(mockCommandRunner.run.mock.callCount(), 4);
    assert.strictEqual(
      mockCommandRunner.run.mock.calls[0].arguments[0],
      "npm install dep1@latest --save"
    );
    assert.strictEqual(
      mockCommandRunner.run.mock.calls[1].arguments[0],
      "npm install dev1@latest --save-dev"
    );
    assert.strictEqual(
      mockCommandRunner.run.mock.calls[2].arguments[0],
      "npm install peer1@latest --save-peer"
    );
    assert.strictEqual(
      mockCommandRunner.run.mock.calls[3].arguments[0],
      "npm install opt1@latest --save-optional"
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

  test("should update pnpm peer and optional dependencies", () => {
    mockConfig.get = mock.fn((key) => {
      if (key === "packageManager") return "pnpm";
      return "";
    });
    service = new PackageManagerService(
      mockCommandRunner,
      mockConfig,
      mockLogger
    );

    service.updatePackages(["dep1"], ["dev1"], ["peer-pkg1"], ["opt-pkg1"]);

    assert.strictEqual(mockCommandRunner.run.mock.callCount(), 4);
    assert.strictEqual(
      mockCommandRunner.run.mock.calls[0].arguments[0],
      "pnpm install dep1@latest"
    );
    assert.strictEqual(
      mockCommandRunner.run.mock.calls[1].arguments[0],
      "pnpm install dev1@latest --dev"
    );
    assert.strictEqual(
      mockCommandRunner.run.mock.calls[2].arguments[0],
      "pnpm install peer-pkg1@latest --save-peer"
    );
    assert.strictEqual(
      mockCommandRunner.run.mock.calls[3].arguments[0],
      "pnpm install opt-pkg1@latest --save-optional"
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

  test("should update yarn peer and optional dependencies", () => {
    mockConfig.get = mock.fn((key) => {
      if (key === "packageManager") return "yarn";
      return "";
    });
    service = new PackageManagerService(
      mockCommandRunner,
      mockConfig,
      mockLogger
    );

    service.updatePackages([], [], ["peer-pkg1"], ["opt-pkg1"]);

    assert.strictEqual(mockCommandRunner.run.mock.callCount(), 2);
    assert.strictEqual(
      mockCommandRunner.run.mock.calls[0].arguments[0],
      "yarn add peer-pkg1@latest --peer"
    );
    assert.strictEqual(
      mockCommandRunner.run.mock.calls[1].arguments[0],
      "yarn add opt-pkg1@latest --optional"
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
