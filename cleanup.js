"use strict"

const core = require("@actions/core")
const fs = require("fs")

function T(){}

(async () => {
    if(core.getState("AutoUpdaterPID")) await new Promise((res, rej) => {
        try {
            const e = process.kill(core.getState("AutoUpdaterPID"))
            res(e)
            return
        } catch (err) {
            if(err.code === "ESRCH"){
                res()
                return
            }
            rej(err)
        }
    })
    if(core.getState("AutoUpdaterWorkDir")) await fs.promises.rmdir(core.getState("AutoUpdaterWorkDir")).catch((e)=>{
        if(e.code === "ENOENT") return Promise.resolve()
        return Promise.reject(e)
    })
    return
})().then((e) => {
    core.info((e) ? e : "Completed")
    setTimeout(process.exit, 1, 0)
}).catch((e) => {
    const err = (e) ? e : new Error("Unknown error")
    core.error(err)
    core.setFailed(err)
    setTimeout(process.exit, 1, 1)
})