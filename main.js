"use strict";

const core = require("@actions/core");
const { readFileSync, writeFileSync, mkdtempSync, existsSync } = require("fs");
const { spawnSync } = require("child_process");
const { join, normalize } = require("path");

(async () => {
  /**
   * token for working with git
   */
  const token = core.getInput("token") || process.env.GITHUB_TOKEN;
  /**
   * email of the commit author
   */
  const authorEmail = core.getInput("author-email") || "actions@github.com";
  /**
   * name of the commit author
   */
  const authorName = core.getInput("author-name") || "GitHUB Actions";
  /**
   * reference of the repository like `REPO_OWNER/REPO_NAME`
   */
  const ref = core.getInput("ref") || process.env.GITHUB_REPOSITORY;
  /**
   * the repository branch name
   */
  const branch = core.getInput("branch") || "master";
  /**
   * working directory
   */
  const dir = core.getInput("working-directory") || mkdtempSync();
  /**
   * path to the changelog file
   */
  const changelogFilePath = core.getInput("changelog-file") || "";
  /**
   * path to the package file
   */
  const packageFilePath = core.getInput("package-file") || "./package.json";
  /**
   * package manager like `npm` or `yarn`
   */
  const packageManager = core.getInput("package-manager") || "npm";
  /**
   * true if debug is enable
   */
  const debug = core.getInput("debug") === "true";
  /**
   * commands executed after the update
   */
  const buildsAndChecks = core.getMultilineInput("builds-and-checks") || [];
  /**
   * do not update the following packages
   */
  const ignorePackages = core.getMultilineInput("ignore-packages") || [];

  core.saveState("AutoUpdaterWorkDir", dir);
  core.saveState("AutoUpdaterPID", process.pid);

  /**
   * Logging function
   *
   * @param {string} str - string for logging
   */
  const log = (str) => {
    if (debug) core.info(`${new Date().toJSON()} ${str}`);
  };
  /**
   * Run the command
   *
   * @param {string} str - command to execute
   * @param {boolean} ignoreExitCode - ignore exit code
   */
  const run = (str, ignoreExitCode = false) => {
    log(`RUN ${str}`);
    const arg = str.split(" ");
    const com = arg.shift();
    const resp = spawnSync(com, arg, {
      cwd: dir,
    });
    if (resp.status !== 0 && !ignoreExitCode)
      throw new Error(resp.stderr.toString());
    log(`RESULT: ${resp && resp.output ? resp.output.join("\n") : ""}`);
    return resp.stdout;
  };

  // install yarn if it needs
  if (packageManager === "yarn") run(`npm install yarn -g`);

  // If the repository is not initialized, I initialize it.
  if (!existsSync(join(dir, ".git"))) run(`git init`);

  // Adding a link to a remote repository with an authorization token
  run(
    `git remote add autoupdater https://oauth2:${token}@github.com/${ref}.git`
  );

  // Adding global git settings
  run(`git config --global user.email "${authorEmail}"`);
  run(`git config --global user.name "${authorName}"`);

  // Fetch remote repository
  run(`git fetch autoupdater`);

  // Checkout branch of the repository
  run(`git checkout ${branch}`);

  let packageFile = readFileSync(join(dir, packageFilePath)).toString();
  /**
   * @typedef PackageData
   * @type {Object}
   * @property {string} name
   * @property {string} version
   * @property {Object<string, string>} dependencies
   * @property {Object<string, string>} devDependencies
   */
  /**
   * @type {PackageData}
   */
  let packageData = JSON.parse(packageFile);
  let dependenciesForUpdating = (
    packageData.dependencies ? Object.keys(packageData.dependencies) : []
  ).filter((e) => ignorePackages.indexOf(e) === -1);
  let devDependenciesForUpdating = (
    packageData.devDependencies ? Object.keys(packageData.devDependencies) : []
  ).filter((e) => ignorePackages.indexOf(e) === -1);
  /**
   * Outdated libs
   *
   * @type {Array<string>}
   */
  let outdatedLibs = [];
  if (packageManager === "npm") {
    // install dependencies
    run(`npm ci`, true);
    // get outdated libs
    outdatedLibs = run(`npm outdate`, true)
      .toString()
      .split("\n")
      .map((e) => e.replace(/\s.+$/gi, ""))
      .filter((e) => ["Package", ""].indexOf(e) === -1);
    dependenciesForUpdating = dependenciesForUpdating.filter(
      (e) => outdatedLibs.indexOf(e) !== -1
    );
    devDependenciesForUpdating = devDependenciesForUpdating.filter(
      (e) => outdatedLibs.indexOf(e) !== -1
    );
    // install outdated dependencies
    if (dependenciesForUpdating.length > 0)
      run(
        `npm install ${dependenciesForUpdating
          .map((e) => `${e}@latest`)
          .join(" ")} --save`
      );
    // install outdated dev dependencies
    if (devDependenciesForUpdating.length > 0)
      run(
        `npm install ${devDependenciesForUpdating
          .map((e) => `${e}@latest`)
          .join(" ")} --save-dev`
      );
    // get outdated libs after update
    const outdatedLibs2 = run(`npm outdate`, true)
      .toString()
      .split("\n")
      .map((e) => e.replace(/\s.+$/gi, ""))
      .filter((e) => ["Package", ""].indexOf(e) === -1);
    outdatedLibs = outdatedLibs.filter((e) => outdatedLibs2.indexOf(e) === -1);
  } else if (packageManager === "yarn") {
    // install dependencies
    run(`yarn install --frozen-lockfile`, true);
    // get outdated libs
    outdatedLibs = run(`yarn outdated`, true)
      .toString()
      .split("\n")
      .map((e) => e.replace(/\s.+$/gi, ""))
      .filter((e) => ["yarn", "info", "Package", "", "Done"].indexOf(e) === -1);
    dependenciesForUpdating = dependenciesForUpdating.filter(
      (e) => outdatedLibs.indexOf(e) !== -1
    );
    devDependenciesForUpdating = devDependenciesForUpdating.filter(
      (e) => outdatedLibs.indexOf(e) !== -1
    );
    // install outdated dependencies
    if (dependenciesForUpdating.length > 0)
      run(
        `yarn add ${dependenciesForUpdating
          .map((e) => `${e}@latest`)
          .join(" ")}`
      );
    // install outdated dev dependencies
    if (devDependenciesForUpdating.length > 0)
      run(
        `yarn add ${devDependenciesForUpdating
          .map((e) => `${e}@latest`)
          .join(" ")} --dev`
      );
    // get outdated libs after update
    const outdatedLibs2 = run(`yarn outdated`, true)
      .toString()
      .split("\n")
      .map((e) => e.replace(/\s.+$/gi, ""))
      .filter((e) => ["yarn", "info", "Package", "", "Done"].indexOf(e) === -1);
    outdatedLibs = outdatedLibs.filter((e) => outdatedLibs2.indexOf(e) === -1);
  } else {
    throw new Error("Invalid package manager name, use npm or yarn.");
  }

  if (outdatedLibs.length > 0) {
    // update changelog file
    if (changelogFilePath) {
      const changelogPath = join(dir, changelogFilePath);
      const changelogData = existsSync(changelogPath)
        ? readFileSync(changelogPath, {
            flag: "r",
          })
        : Buffer.from("");
      const msg =
        `# ${
          packageData.version + 1 ||
          "0.0.1"
            .split(".")
            .map((e, ind, arr) =>
              ind !== arr.length - 1
                ? Number.parseInt(e)
                : Number.parseInt(e) + 1
            )
            .join(".")
        } / ${new Date().toJSON().substring(0, 10)}\n\n` +
        `### :tada: Enhancements\n- Updated dependencies: ${outdatedLibs.join(
          ", "
        )}\n\n`;
      writeFileSync(
        changelogPath,
        Buffer.concat([Buffer.from(msg), changelogData]),
        {
          encoding: "utf8",
          flag: "w",
        }
      );
    }

    // add changes of files
    run(`git add --all`);
    run(`git commit -m 'dependencies'`);

    // change version, make commit and tag
    switch (packageManager) {
      case "npm":
        run(`npm version patch`);
        break;
      case "yarn":
        run(`yarn version --new-version patch`);
        break;
    }

    // reload package data
    packageFile = readFileSync(join(dir, packageFilePath)).toString();
    packageData = JSON.parse(packageFile);

    // run user stages before push
    buildsAndChecks.forEach((command) => {
      run(command);
    });

    // push changes and tags
    run(`git push autoupdater ${branch}`);
    run(`git push autoupdater --tags`);
  }

  core.setOutput("version", packageData.version);
  core.setOutput("updated", outdatedLibs.length > 0);
  core.setOutput("dir", dir);
  return outdatedLibs;
})()
  .then((e) => {
    core.info(
      Array.isArray(e) && e.length > 0
        ? `Completed (${e.join(", ")} ${
            e.length > 1 ? "were" : "was"
          } updated).`
        : "Completed."
    );
    setTimeout(process.exit, 1, 0);
  })
  .catch((e) => {
    const err = e ? e : new Error("Unknown error");
    core.error(err);
    core.setFailed(err);
    setTimeout(process.exit, 1, 1);
  });
