"use strict";

const { test, describe, mock, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const FileSystem = require("../src/utils/file-system");

describe("FileSystem", () => {
  let testFile;
  let testJsonFile;

  beforeEach(() => {
    testFile = path.join(__dirname, "test-file.txt");
    testJsonFile = path.join(__dirname, "test-file.json");
  });

  afterEach(() => {
    // Clean up test files
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
    }
    if (fs.existsSync(testJsonFile)) {
      fs.unlinkSync(testJsonFile);
    }
  });

  test("should read JSON file successfully", () => {
    const testData = { name: "test", version: "1.0.0" };
    fs.writeFileSync(testJsonFile, JSON.stringify(testData));

    const result = FileSystem.readJsonFile(testJsonFile);

    assert.deepStrictEqual(result, testData);
  });

  test("should throw error for non-existent JSON file", () => {
    assert.throws(
      () => FileSystem.readJsonFile("/non/existent/file.json"),
      /File not found/
    );
  });

  test("should throw error for invalid JSON", () => {
    fs.writeFileSync(testJsonFile, "invalid json");

    assert.throws(
      () => FileSystem.readJsonFile(testJsonFile),
      /Failed to parse JSON file/
    );
  });

  test("should write JSON file successfully", () => {
    const testData = { name: "test", version: "2.0.0" };

    FileSystem.writeJsonFile(testJsonFile, testData);

    const result = JSON.parse(fs.readFileSync(testJsonFile, "utf8"));
    assert.deepStrictEqual(result, testData);
  });

  test("should write JSON file with custom indentation", () => {
    const testData = { name: "test" };

    FileSystem.writeJsonFile(testJsonFile, testData, 4);

    const content = fs.readFileSync(testJsonFile, "utf8");
    assert.ok(content.includes('    "name"'));
  });

  test("should read text file successfully", () => {
    const testContent = "Hello, World!";
    fs.writeFileSync(testFile, testContent);

    const result = FileSystem.readTextFile(testFile);

    assert.strictEqual(result, testContent);
  });

  test("should throw error for non-existent text file", () => {
    assert.throws(
      () => FileSystem.readTextFile("/non/existent/file.txt"),
      /File not found/
    );
  });

  test("should write text file successfully", () => {
    const testContent = "Hello, World!";

    FileSystem.writeTextFile(testFile, testContent);

    const result = fs.readFileSync(testFile, "utf8");
    assert.strictEqual(result, testContent);
  });

  test("should check file existence", () => {
    assert.strictEqual(FileSystem.exists(testFile), false);

    fs.writeFileSync(testFile, "test");
    assert.strictEqual(FileSystem.exists(testFile), true);
  });

  test("should get absolute path", () => {
    const basePath = "/base/path";
    const relativePath = "relative/file.txt";
    const expected = "/base/path/relative/file.txt";

    const result = FileSystem.getAbsolutePath(basePath, relativePath);

    assert.strictEqual(result, expected);
  });
});
