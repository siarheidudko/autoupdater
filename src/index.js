"use strict";

const core = require("@actions/core");
const { mkdtempSync } = require("fs");

const Config = require("./config/config");
const Logger = require("./utils/logger");
const CommandRunner = require("./utils/command-runner");
const GitService = require("./services/git-service");
const PackageManagerService = require("./services/package-manager-service");
const ChangelogService = require("./services/changelog-service");
const AutoUpdater = require("./autoupdater");

/**
 * Application factory for creating and configuring services
 */
class AppFactory {
  /**
   * Create and configure all services
   * @returns {Object} Configured services
   */
  static createServices() {
    // Load configuration
    const config = new Config();

    // Use provided working directory or create temp directory
    const workingDirectory =
      config.get("workingDirectory") || mkdtempSync("autoupdater-");

    // Create new config with updated working directory if needed
    if (!config.get("workingDirectory")) {
      const newConfigData = { ...config.getAll(), workingDirectory };
      config._config = newConfigData;
      Object.freeze(config._config);
    }

    // Create utilities
    const logger = new Logger(config);
    const commandRunner = new CommandRunner(logger, workingDirectory);

    // Create services
    const gitService = new GitService(commandRunner, config, logger);
    const packageManagerService = new PackageManagerService(
      commandRunner,
      config,
      logger
    );
    const changelogService = new ChangelogService(config, logger);

    // Create main autoupdater
    const autoUpdater = new AutoUpdater(
      config,
      logger,
      gitService,
      packageManagerService,
      changelogService,
      commandRunner
    );

    return {
      config,
      logger,
      autoUpdater,
      workingDirectory,
    };
  }
}

/**
 * Main application entry point
 */
async function main() {
  let services;

  try {
    // Create services
    services = AppFactory.createServices();
    const { logger, autoUpdater, workingDirectory } = services;

    // Save state for cleanup
    core.saveState("AutoUpdaterWorkDir", workingDirectory);
    core.saveState("AutoUpdaterPID", process.pid);

    // Run autoupdate
    const result = await autoUpdater.run();

    // Set outputs
    core.setOutput("version", result.version);
    core.setOutput("updated", result.updated);
    core.setOutput("dir", workingDirectory);

    // Log completion
    const message = result.updated
      ? `Completed (${result.updatedPackages.join(", ")} ${
          result.updatedPackages.length > 1 ? "were" : "was"
        } updated).`
      : "Completed.";

    logger.info(message);

    return result.updatedPackages;
  } catch (error) {
    const err = error || new Error("Unknown error");

    if (services?.logger) {
      services.logger.error(err);
      services.logger.setFailed(err);
    } else {
      core.error(err);
      core.setFailed(err);
    }

    throw err;
  }
}

// Export for testing
module.exports = {
  main,
  AppFactory,
};

// Run if this file is executed directly
if (require.main === module) {
  main()
    .then(() => {
      setTimeout(process.exit, 1, 0);
    })
    .catch(() => {
      setTimeout(process.exit, 1, 1);
    });
}
