"use strict";

const { join } = require("path");

/**
 * Git service for handling Git operations
 */
class GitService {
  constructor(commandRunner, config, logger) {
    this.commandRunner = commandRunner;
    this.config = config;
    this.logger = logger;
  }

  /**
   * Initialize Git repository if needed
   */
  initializeRepository() {
    const gitPath = join(this.config.get("workingDirectory"), ".git");
    if (!require("fs").existsSync(gitPath)) {
      this.commandRunner.run("git init");
    }
  }

  /**
   * Setup Git configuration and remote
   */
  setupGit() {
    const token = this.config.get("token");
    const ref = this.config.get("ref");
    const authorEmail = this.config.get("authorEmail");
    const authorName = this.config.get("authorName");

    // Add remote repository with token
    this.commandRunner.run(
      `git remote add autoupdater https://oauth2:${token}@github.com/${ref}.git`
    );

    // Set global git config
    this.commandRunner.run(`git config --global user.email "${authorEmail}"`);
    this.commandRunner.run(`git config --global user.name "${authorName}"`);
  }

  /**
   * Fetch and checkout branch
   */
  fetchAndCheckout() {
    const branch = this.config.get("branch");

    this.commandRunner.run("git fetch autoupdater");
    this.commandRunner.run(`git checkout ${branch}`);
  }

  /**
   * Commit changes
   * @param {string} message - Commit message
   */
  commit(message) {
    this.commandRunner.run("git add --all");
    this.commandRunner.run(`git commit -m "${message}"`);
  }

  /**
   * Push changes and tags
   */
  push() {
    const branch = this.config.get("branch");

    this.commandRunner.run(`git push autoupdater ${branch}`);
    this.commandRunner.run("git push autoupdater --tags");
  }

  /**
   * Create version tag
   * @param {string} packageManager - Package manager to use for versioning
   */
  createVersionTag(packageManager) {
    const versionCommands = {
      npm: "npm version patch",
      pnpm: "pnpm version patch",
      yarn: "yarn version --new-version patch",
    };

    const command = versionCommands[packageManager];
    if (!command) {
      throw new Error(
        `Unsupported package manager for versioning: ${packageManager}`
      );
    }

    this.commandRunner.run(command);
  }
}

module.exports = GitService;
