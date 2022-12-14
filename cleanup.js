"use strict";

const core = require("@actions/core");
const { rmSync } = require("fs");

(async () => {
  // kill the process
  if (core.getState("AutoUpdaterPID"))
    await new Promise((res, rej) => {
      try {
        const e = process.kill(core.getState("AutoUpdaterPID"));
        res(e);
        return;
      } catch (err) {
        if (err.code === "ESRCH") {
          res();
          return;
        }
        rej(err);
      }
    });

  // clean up directory
  if (core.getState("AutoUpdaterWorkDir"))
    rmSync(core.getState("AutoUpdaterWorkDir"), {
      recursive: true,
      force: true,
    });
  return;
})()
  .then((e) => {
    core.info(e ? e : "Completed");
    setTimeout(process.exit, 1, 0);
  })
  .catch((e) => {
    const err = e ? e : new Error("Unknown error");
    core.error(err);
    core.setFailed(err);
    setTimeout(process.exit, 1, 1);
  });
