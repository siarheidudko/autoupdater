"use strict";

const core = require("@actions/core");

/**
 * Configuration class for managing application settings
 */
class Config {
  constructor() {
    this._config = this._loadConfig();
    Object.freeze(this._config);
  }

  /**
   * Load configuration from GitHub Actions inputs or environment variables
   * @private
   * @returns {Object} Configuration object
   */
  _loadConfig() {
    return {
      token: core.getInput("token") || process.env.GITHUB_TOKEN,
      authorEmail: core.getInput("author-email") || "actions@github.com",
      authorName: core.getInput("author-name") || "GitHUB Actions",
      ref: core.getInput("ref") || process.env.GITHUB_REPOSITORY,
      branch: core.getInput("branch") || "master",
      workingDirectory:
        core.getInput("working-directory") || process.env.GITHUB_WORKSPACE,
      changelogFilePath: core.getInput("changelog-file") || "./CHANGELOG.md",
      packageFilePath: core.getInput("package-file") || "./package.json",
      packageManager: this._validatePackageManager(
        core.getInput("package-manager") || "npm"
      ),
      debug: core.getInput("debug") === "true",
      buildsAndChecks: core.getMultilineInput("builds-and-checks") || [],
      ignorePackages: core.getMultilineInput("ignore-packages") || [],
    };
  }

  /**
   * Validate package manager
   * @private
   * @param {string} manager - Package manager name
   * @returns {string} Validated package manager
   * @throws {Error} If package manager is invalid
   */
  _validatePackageManager(manager) {
    const validManagers = ["npm", "pnpm", "yarn"];
    if (!validManagers.includes(manager)) {
      throw new Error(
        `Invalid package manager: ${manager}. Use one of: ${validManagers.join(
          ", "
        )}`
      );
    }
    return manager;
  }

  /**
   * Get configuration value
   * @param {string} key - Configuration key
   * @returns {*} Configuration value
   */
  get(key) {
    return this._config[key];
  }

  /**
   * Get all configuration
   * @returns {Object} Configuration object
   */
  getAll() {
    return { ...this._config };
  }

  /**
   * Check if debug mode is enabled
   * @returns {boolean} True if debug mode is enabled
   */
  isDebugEnabled() {
    return this._config.debug;
  }
}

module.exports = Config;
