"use strict";

const core = require("@actions/core");

/**
 * Logger utility class
 */
class Logger {
  constructor(config) {
    this.debug = config.isDebugEnabled();
  }

  /**
   * Log info message
   * @param {string} message - Message to log
   */
  info(message) {
    core.info(message);
  }

  /**
   * Log error message
   * @param {string|Error} message - Message or error to log
   */
  error(message) {
    core.error(message);
  }

  /**
   * Log debug message (only if debug is enabled)
   * @param {string} message - Message to log
   */
  log(message) {
    if (this.debug) {
      core.info(`${new Date().toJSON()} ${message}`);
    }
  }

  /**
   * Set failed status with error message
   * @param {string|Error} message - Error message
   */
  setFailed(message) {
    core.setFailed(message);
  }
}

module.exports = Logger;
