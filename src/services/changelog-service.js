"use strict";

const FileSystem = require("../utils/file-system");

/**
 * Changelog service for managing changelog updates
 */
class ChangelogService {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
  }

  /**
   * Update changelog with new version and updated packages
   * @param {string} currentVersion - Current package version
   * @param {string[]} updatedPackages - List of updated package names
   */
  updateChangelog(currentVersion, updatedPackages) {
    const changelogPath = this.config.get("changelogFilePath");

    if (!changelogPath) {
      this.logger.log("No changelog file specified, skipping changelog update");
      return;
    }

    const fullChangelogPath = FileSystem.getAbsolutePath(
      this.config.get("workingDirectory"),
      changelogPath
    );

    try {
      const newVersion = this._calculateNewVersion(currentVersion);
      const changelogEntry = this._createChangelogEntry(
        newVersion,
        updatedPackages
      );

      const existingContent = FileSystem.exists(fullChangelogPath)
        ? FileSystem.readTextFile(fullChangelogPath)
        : "";

      const updatedContent = changelogEntry + existingContent;
      FileSystem.writeTextFile(fullChangelogPath, updatedContent);

      this.logger.log(`Changelog updated with version ${newVersion}`);
    } catch (error) {
      this.logger.error(`Failed to update changelog: ${error.message}`);
      throw error;
    }
  }

  /**
   * Calculate new version (increment patch)
   * @private
   * @param {string} currentVersion - Current version
   * @returns {string} New version
   */
  _calculateNewVersion(currentVersion) {
    const versionParts = (currentVersion || "0.0.0").split(".");
    const major = parseInt(versionParts[0]) || 0;
    const minor = parseInt(versionParts[1]) || 0;
    const patch = parseInt(versionParts[2]) || 0;

    return `${major}.${minor}.${patch + 1}`;
  }

  /**
   * Create changelog entry
   * @private
   * @param {string} version - New version
   * @param {string[]} updatedPackages - Updated packages
   * @returns {string} Changelog entry
   */
  _createChangelogEntry(version, updatedPackages) {
    const date = new Date().toISOString().substring(0, 10);
    const packagesText = updatedPackages.join(", ");

    return `# ${version} / ${date}\n\n### :tada: Enhancements\n- Updated dependencies: ${packagesText}\n\n`;
  }
}

module.exports = ChangelogService;
