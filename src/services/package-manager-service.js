"use strict";

/**
 * Package manager service for handling dependency updates
 */
class PackageManagerService {
  constructor(commandRunner, config, logger) {
    this.commandRunner = commandRunner;
    this.config = config;
    this.logger = logger;
    this.packageManager = config.get("packageManager");
  }

  /**
   * Install global package manager if needed
   */
  installPackageManager() {
    if (this.packageManager === "pnpm") {
      this.commandRunner.run("npm install pnpm -g");
    } else if (this.packageManager === "yarn") {
      this.commandRunner.run("npm install yarn -g");
    }
  }

  /**
   * Install dependencies
   */
  installDependencies() {
    const installCommands = {
      npm: "npm ci",
      pnpm: "pnpm install --frozen-lockfile",
      yarn: "yarn install --frozen-lockfile",
    };

    const command = installCommands[this.packageManager];
    this.commandRunner.run(command, true);
  }

  /**
   * Get outdated packages
   * @returns {string[]} Array of outdated package names
   */
  getOutdatedPackages() {
    try {
      switch (this.packageManager) {
        case "npm":
          return this._getNpmOutdated();
        case "pnpm":
          return this._getPnpmOutdated();
        case "yarn":
          return this._getYarnOutdated();
        default:
          throw new Error(
            `Unsupported package manager: ${this.packageManager}`
          );
      }
    } catch (error) {
      this.logger.log(`Error getting outdated packages: ${error.message}`);
      return [];
    }
  }

  /**
   * Update packages
   * @param {string[]} dependencies - Regular dependencies to update
   * @param {string[]} devDependencies - Dev dependencies to update
   */
  updatePackages(dependencies, devDependencies) {
    switch (this.packageManager) {
      case "npm":
        this._updateNpmPackages(dependencies, devDependencies);
        break;
      case "pnpm":
        this._updatePnpmPackages(dependencies, devDependencies);
        break;
      case "yarn":
        this._updateYarnPackages(dependencies, devDependencies);
        break;
      default:
        throw new Error(`Unsupported package manager: ${this.packageManager}`);
    }
  }

  /**
   * Get NPM outdated packages
   * @private
   * @returns {string[]} Outdated package names
   */
  _getNpmOutdated() {
    const output = this.commandRunner.run("npm outdated --json", true);
    const outdated = JSON.parse(output.toString() || "{}");
    return Object.keys(outdated);
  }

  /**
   * Get PNPM outdated packages
   * @private
   * @returns {string[]} Outdated package names
   */
  _getPnpmOutdated() {
    const output = this.commandRunner.run("pnpm outdated --format json", true);
    const outdated = JSON.parse(output.toString() || "{}");
    return Object.keys(outdated);
  }

  /**
   * Get Yarn outdated packages
   * @private
   * @returns {string[]} Outdated package names
   */
  _getYarnOutdated() {
    const output = this.commandRunner.run("yarn outdated --json", true);
    return output
      .toString()
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter((data) => data?.type === "table")
      .flatMap((data) => data.data.body.map((row) => row[0]));
  }

  /**
   * Update NPM packages
   * @private
   * @param {string[]} dependencies - Regular dependencies
   * @param {string[]} devDependencies - Dev dependencies
   */
  _updateNpmPackages(dependencies, devDependencies) {
    if (dependencies.length > 0) {
      const packages = dependencies.map((pkg) => `${pkg}@latest`).join(" ");
      this.commandRunner.run(`npm install ${packages} --save`);
    }

    if (devDependencies.length > 0) {
      const packages = devDependencies.map((pkg) => `${pkg}@latest`).join(" ");
      this.commandRunner.run(`npm install ${packages} --save-dev`);
    }
  }

  /**
   * Update PNPM packages
   * @private
   * @param {string[]} dependencies - Regular dependencies
   * @param {string[]} devDependencies - Dev dependencies
   */
  _updatePnpmPackages(dependencies, devDependencies) {
    if (dependencies.length > 0) {
      const packages = dependencies.map((pkg) => `${pkg}@latest`).join(" ");
      this.commandRunner.run(`pnpm install ${packages}`);
    }

    if (devDependencies.length > 0) {
      const packages = devDependencies.map((pkg) => `${pkg}@latest`).join(" ");
      this.commandRunner.run(`pnpm install ${packages} --dev`);
    }
  }

  /**
   * Update Yarn packages
   * @private
   * @param {string[]} dependencies - Regular dependencies
   * @param {string[]} devDependencies - Dev dependencies
   */
  _updateYarnPackages(dependencies, devDependencies) {
    if (dependencies.length > 0) {
      const packages = dependencies.map((pkg) => `${pkg}@latest`).join(" ");
      this.commandRunner.run(`yarn add ${packages}`);
    }

    if (devDependencies.length > 0) {
      const packages = devDependencies.map((pkg) => `${pkg}@latest`).join(" ");
      this.commandRunner.run(`yarn add ${packages} --dev`);
    }
  }
}

module.exports = PackageManagerService;
