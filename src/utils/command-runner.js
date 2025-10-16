"use strict";

const { spawnSync } = require("child_process");

/**
 * Command runner utility class
 */
class CommandRunner {
  constructor(logger, workingDirectory) {
    this.logger = logger;
    this.workingDirectory = workingDirectory;
  }

  /**
   * Execute a command
   * @param {string} command - Command to execute
   * @param {boolean} ignoreExitCode - Whether to ignore non-zero exit codes
   * @returns {Buffer} Command stdout
   * @throws {Error} If command fails and ignoreExitCode is false
   */
  run(command, ignoreExitCode = false) {
    this.logger.log(`RUN ${command}`);

    const args = command.split(" ");
    const cmd = args.shift();

    const result = spawnSync(cmd, args, {
      cwd: this.workingDirectory,
      encoding: "utf8",
    });

    if (result.status !== 0 && !ignoreExitCode) {
      const errorMessage =
        result.stderr || `Command failed with exit code ${result.status}`;
      throw new Error(errorMessage);
    }

    this.logger.log(`RESULT: ${result.stdout || ""}`);
    return Buffer.from(result.stdout || "");
  }

  /**
   * Execute multiple commands in sequence
   * @param {string[]} commands - Array of commands to execute
   * @param {boolean} ignoreExitCode - Whether to ignore non-zero exit codes
   * @returns {Buffer[]} Array of command outputs
   */
  runSequence(commands, ignoreExitCode = false) {
    return commands.map((command) => this.run(command, ignoreExitCode));
  }
}

module.exports = CommandRunner;
