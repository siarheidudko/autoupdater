"use strict"

const core = require("@actions/core")
const fs = require("fs")

(async () => {
    process.kill(core.getState("AutoUpdaterPID"))
    await fs.promises.rmdir(core.getState("AutoUpdaterWorkDir")).catch((e)=>{
        if(e.code === "ENOENT") return Promise.resolve()
        return Promise.reject(e)
    })
})().then((e) => {
    core.info((e) ? e : "Completed")
    setTimeout(process.exit, 1, 0)
}).catch((e) => {
    core.setFailed((e) ? e : new Error("Unknown error"))
    setTimeout(process.exit, 1, 1)
})