"use strict";

const { test, describe, mock, beforeEach } = require("node:test");
const assert = require("node:assert");

const ChangelogService = require("../src/services/changelog-service");

describe("ChangelogService", () => {
  let service;
  let mockConfig;
  let mockLogger;
  let mockFileSystem;

  beforeEach(() => {
    mockConfig = {
      get: mock.fn((key) => {
        switch (key) {
          case "changelogFilePath":
            return "./CHANGELOG.md";
          case "workingDirectory":
            return "/test/dir";
          default:
            return "";
        }
      }),
    };

    mockLogger = {
      log: mock.fn(),
      error: mock.fn(),
    };

    // Mock FileSystem
    mockFileSystem = {
      getAbsolutePath: mock.fn(() => "/test/dir/CHANGELOG.md"),
      exists: mock.fn(() => true),
      readTextFile: mock.fn(() => "# Existing content\n"),
      writeTextFile: mock.fn(),
    };

    // Replace FileSystem methods
    const FileSystem = require("../src/utils/file-system");
    Object.keys(mockFileSystem).forEach((method) => {
      mock.method(FileSystem, method, mockFileSystem[method]);
    });

    service = new ChangelogService(mockConfig, mockLogger);
  });

  test("should update changelog with new version", () => {
    const currentVersion = "1.0.0";
    const updatedPackages = ["package1", "package2"];

    service.updateChangelog(currentVersion, updatedPackages);

    assert.strictEqual(mockFileSystem.writeTextFile.mock.callCount(), 1);

    const writtenContent =
      mockFileSystem.writeTextFile.mock.calls[0].arguments[1];
    assert.ok(writtenContent.includes("# 1.0.1"));
    assert.ok(writtenContent.includes("package1, package2"));
    assert.ok(writtenContent.includes("# Existing content"));
  });

  test("should handle missing changelog file", () => {
    mockConfig.get = mock.fn((key) => {
      if (key === "changelogFilePath") return "";
      return "/test/dir";
    });
    service = new ChangelogService(mockConfig, mockLogger);

    service.updateChangelog("1.0.0", ["package1"]);

    assert.strictEqual(mockLogger.log.mock.callCount(), 1);
    assert.ok(
      mockLogger.log.mock.calls[0].arguments[0].includes(
        "No changelog file specified"
      )
    );
  });

  test("should handle non-existent changelog file", () => {
    const FileSystem = require("../src/utils/file-system");
    mock.method(FileSystem, "exists", () => false);
    mock.method(FileSystem, "writeTextFile", mock.fn());

    service.updateChangelog("1.0.0", ["package1"]);

    assert.strictEqual(FileSystem.writeTextFile.mock.callCount(), 1);

    const writtenContent = FileSystem.writeTextFile.mock.calls[0].arguments[1];
    assert.ok(writtenContent.includes("# 1.0.1"));
    assert.ok(!writtenContent.includes("# Existing content"));
  });

  test("should calculate new version correctly", () => {
    const testCases = [
      { input: "1.0.0", expected: "1.0.1" },
      { input: "2.5.10", expected: "2.5.11" },
      { input: "0.0.0", expected: "0.0.1" },
      { input: undefined, expected: "0.0.1" },
      { input: "", expected: "0.0.1" },
    ];

    testCases.forEach(({ input, expected }) => {
      service.updateChangelog(input, ["test-package"]);

      const writtenContent =
        mockFileSystem.writeTextFile.mock.calls.slice(-1)[0].arguments[1];
      assert.ok(writtenContent.includes(`# ${expected}`));
    });
  });

  test("should include current date in changelog", () => {
    const currentDate = new Date().toISOString().substring(0, 10);

    service.updateChangelog("1.0.0", ["package1"]);

    const writtenContent =
      mockFileSystem.writeTextFile.mock.calls[0].arguments[1];
    assert.ok(writtenContent.includes(currentDate));
  });

  test("should handle file system errors", () => {
    const FileSystem = require("../src/utils/file-system");
    mock.method(FileSystem, "writeTextFile", () => {
      throw new Error("Write failed");
    });

    assert.throws(
      () => service.updateChangelog("1.0.0", ["package1"]),
      /Write failed/
    );

    assert.strictEqual(mockLogger.error.mock.callCount(), 1);
    assert.ok(
      mockLogger.error.mock.calls[0].arguments[0].includes(
        "Failed to update changelog"
      )
    );
  });

  test("should format package list correctly", () => {
    const packages = ["@types/node", "eslint", "typescript"];

    service.updateChangelog("1.0.0", packages);

    const writtenContent =
      mockFileSystem.writeTextFile.mock.calls[0].arguments[1];
    assert.ok(writtenContent.includes("@types/node, eslint, typescript"));
  });
});
