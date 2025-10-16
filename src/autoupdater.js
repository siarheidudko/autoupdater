"use strict";

const FileSystem = require("./utils/file-system");

/**
 * Main autoupdater service
 */
class AutoUpdater {
  constructor(
    config,
    logger,
    gitService,
    packageManagerService,
    changelogService,
    commandRunner
  ) {
    this.config = config;
    this.logger = logger;
    this.gitService = gitService;
    this.packageManagerService = packageManagerService;
    this.changelogService = changelogService;
    this.commandRunner = commandRunner;
  }

  /**
   * Run the autoupdate process
   * @returns {Promise<{updated: boolean, version: string, updatedPackages: string[]}>}
   */
  async run() {
    try {
      this.logger.info("Starting autoupdate process...");

      // Setup Git repository
      this._setupRepository();

      // Load package data
      const packageData = this._loadPackageData();

      // Install package manager and dependencies
      this.packageManagerService.installPackageManager();
      this.packageManagerService.installDependencies();

      // Get outdated packages
      const outdatedPackages = this.packageManagerService.getOutdatedPackages();
      const filteredPackages = this._filterPackages(
        packageData,
        outdatedPackages
      );

      if (
        filteredPackages.dependencies.length === 0 &&
        filteredPackages.devDependencies.length === 0
      ) {
        this.logger.info("No packages to update");
        return {
          updated: false,
          version: packageData.version,
          updatedPackages: [],
        };
      }

      // Update packages
      this.packageManagerService.updatePackages(
        filteredPackages.dependencies,
        filteredPackages.devDependencies
      );

      // Verify which packages were actually updated
      const actuallyUpdated =
        this._getActuallyUpdatedPackages(outdatedPackages);

      if (actuallyUpdated.length === 0) {
        this.logger.info("No packages were actually updated");
        return {
          updated: false,
          version: packageData.version,
          updatedPackages: [],
        };
      }

      // Update changelog
      this.changelogService.updateChangelog(
        packageData.version,
        actuallyUpdated
      );

      // Commit changes
      this.gitService.commit("dependencies");

      // Create version tag
      this.gitService.createVersionTag(this.config.get("packageManager"));

      // Reload package data to get new version
      const updatedPackageData = this._loadPackageData();

      // Run user-defined checks
      this._runBuildsAndChecks();

      // Push changes
      this.gitService.push();

      this.logger.info(
        `Successfully updated ${actuallyUpdated.length} packages`
      );

      return {
        updated: true,
        version: updatedPackageData.version,
        updatedPackages: actuallyUpdated,
      };
    } catch (error) {
      this.logger.error(`Autoupdate failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Setup Git repository
   * @private
   */
  _setupRepository() {
    this.gitService.initializeRepository();
    this.gitService.setupGit();
    this.gitService.fetchAndCheckout();
  }

  /**
   * Load package.json data
   * @private
   * @returns {Object} Package data
   */
  _loadPackageData() {
    const packagePath = FileSystem.getAbsolutePath(
      this.config.get("workingDirectory"),
      this.config.get("packageFilePath")
    );

    return FileSystem.readJsonFile(packagePath);
  }

  /**
   * Filter packages based on ignore list and package type
   * @private
   * @param {Object} packageData - Package.json data
   * @param {string[]} outdatedPackages - List of outdated packages
   * @returns {{dependencies: string[], devDependencies: string[]}} Filtered packages
   */
  _filterPackages(packageData, outdatedPackages) {
    const ignorePackages = this.config.get("ignorePackages");

    const dependencies = (
      packageData.dependencies ? Object.keys(packageData.dependencies) : []
    )
      .filter((pkg) => ignorePackages.indexOf(pkg) === -1)
      .filter((pkg) => outdatedPackages.indexOf(pkg) !== -1);

    const devDependencies = (
      packageData.devDependencies
        ? Object.keys(packageData.devDependencies)
        : []
    )
      .filter((pkg) => ignorePackages.indexOf(pkg) === -1)
      .filter((pkg) => outdatedPackages.indexOf(pkg) !== -1);

    return { dependencies, devDependencies };
  }

  /**
   * Get packages that were actually updated
   * @private
   * @param {string[]} beforeUpdateOutdated - Outdated packages before update
   * @returns {string[]} Actually updated packages
   */
  _getActuallyUpdatedPackages(beforeUpdateOutdated) {
    const afterUpdateOutdated =
      this.packageManagerService.getOutdatedPackages();
    return beforeUpdateOutdated.filter(
      (pkg) => afterUpdateOutdated.indexOf(pkg) === -1
    );
  }

  /**
   * Run user-defined build and check commands
   * @private
   */
  _runBuildsAndChecks() {
    const buildsAndChecks = this.config.get("buildsAndChecks");

    if (buildsAndChecks.length === 0) {
      return;
    }

    this.logger.info("Running builds and checks...");

    for (const command of buildsAndChecks) {
      this.logger.log(`Running: ${command}`);
      this.commandRunner.run(command);
    }
  }
}

module.exports = AutoUpdater;
