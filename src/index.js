import core from "./utils/actions-core.js";
import { mkdtempSync } from "fs";
import Config from "./config/config.js";
import Logger from "./utils/logger.js";
import CommandRunner from "./utils/command-runner.js";
import GitService from "./services/git-service.js";
import PackageManagerService from "./services/package-manager-service.js";
import ChangelogService from "./services/changelog-service.js";
import AutoUpdater from "./autoupdater.js";
import { fileURLToPath } from "url";

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
export {
  main,
  AppFactory,
};

// Run if this file is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main()
    .then(() => {
      setTimeout(process.exit, 1, 0);
    })
    .catch(() => {
      setTimeout(process.exit, 1, 1);
    });
}
