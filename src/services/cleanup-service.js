"use strict";

const core = require("@actions/core");
const { rmSync } = require("fs");

/**
 * Cleanup service for removing temporary files and killing processes
 */
class CleanupService {
  /**
   * Kill process if it exists
   * @param {string} pid - Process ID to kill
   * @returns {Promise<boolean>} True if process was killed or didn't exist
   */
  static async killProcess(pid) {
    if (!pid) {
      return true;
    }

    return new Promise((resolve, reject) => {
      try {
        process.kill(pid);
        resolve(true);
      } catch (err) {
        if (err.code === "ESRCH") {
          // Process doesn't exist, which is fine
          resolve(true);
        } else {
          reject(err);
        }
      }
    });
  }

  /**
   * Remove directory recursively
   * @param {string} dirPath - Directory path to remove
   */
  static removeDirectory(dirPath) {
    if (!dirPath) {
      return;
    }

    try {
      rmSync(dirPath, {
        recursive: true,
        force: true,
      });
    } catch (error) {
      core.error(`Failed to remove directory ${dirPath}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Run full cleanup process
   * @returns {Promise<void>}
   */
  static async runCleanup() {
    const pid = core.getState("AutoUpdaterPID");
    const workDir = core.getState("AutoUpdaterWorkDir");

    // Kill process if needed
    if (pid) {
      await CleanupService.killProcess(pid);
    }

    // Remove temporary directory
    if (workDir) {
      CleanupService.removeDirectory(workDir);
    }
  }
}

/**
 * Main cleanup function
 */
async function main() {
  try {
    await CleanupService.runCleanup();
    core.info("Cleanup completed successfully");
  } catch (error) {
    const err = error || new Error("Unknown cleanup error");
    core.error(err);
    core.setFailed(err);
    throw err;
  }
}

// Export for testing
module.exports = {
  main,
  CleanupService,
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
