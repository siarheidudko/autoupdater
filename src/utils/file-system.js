"use strict";

const { readFileSync, writeFileSync, existsSync } = require("fs");
const { join } = require("path");

/**
 * File system utility class
 */
class FileSystem {
  /**
   * Read JSON file
   * @param {string} filePath - Path to JSON file
   * @returns {Object} Parsed JSON object
   * @throws {Error} If file doesn't exist or is invalid JSON
   */
  static readJsonFile(filePath) {
    if (!existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    try {
      const content = readFileSync(filePath, "utf8");
      return JSON.parse(content);
    } catch (error) {
      throw new Error(
        `Failed to parse JSON file ${filePath}: ${error.message}`
      );
    }
  }

  /**
   * Write JSON file
   * @param {string} filePath - Path to JSON file
   * @param {Object} data - Data to write
   * @param {number} indent - JSON indentation (default: 2)
   */
  static writeJsonFile(filePath, data, indent = 2) {
    try {
      const content = JSON.stringify(data, null, indent);
      writeFileSync(filePath, content, "utf8");
    } catch (error) {
      throw new Error(
        `Failed to write JSON file ${filePath}: ${error.message}`
      );
    }
  }

  /**
   * Read text file
   * @param {string} filePath - Path to text file
   * @returns {string} File content
   * @throws {Error} If file doesn't exist
   */
  static readTextFile(filePath) {
    if (!existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    return readFileSync(filePath, "utf8");
  }

  /**
   * Write text file
   * @param {string} filePath - Path to text file
   * @param {string} content - Content to write
   */
  static writeTextFile(filePath, content) {
    writeFileSync(filePath, content, "utf8");
  }

  /**
   * Check if file exists
   * @param {string} filePath - Path to file
   * @returns {boolean} True if file exists
   */
  static exists(filePath) {
    return existsSync(filePath);
  }

  /**
   * Get absolute path
   * @param {string} basePath - Base path
   * @param {string} relativePath - Relative path
   * @returns {string} Absolute path
   */
  static getAbsolutePath(basePath, relativePath) {
    return join(basePath, relativePath);
  }
}

module.exports = FileSystem;
