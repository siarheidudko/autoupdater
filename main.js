"use strict"

const core = require("@actions/core")
const fs = require("fs")
const child_process = require("child_process")
const os = require("os")
const path = require("path")
const crypto = require("crypto")

const workDir = path.join(os.tmpdir(),
        crypto.randomFillSync(Buffer.alloc(32)).toString("hex"))

async function cpPromise(proc, arg){
    return await new Promise((res, rej) =>{
        const p = child_process.spawn(proc, arg, {
            env: {
                ...process.env
            },
            cwd: workDir
        })
        const log = []
        const err = []
        p.on("close", (e) => {
            res({
                code: e,
                log: Buffer.concat(log).toString("utf8"),
                err: Buffer.concat(err).toString("utf8")
            })
        }).on("error", (e) => {
            rej(e)
        })
        p.stdout.on("data", (e) => {
            log.push(e)
        })
        p.stderr.on("data", (e) => {
            err.push(e)
        })
    })
}

(async () => {
    core.saveState("AutoUpdaterWorkDir", workDir)
    core.saveState("AutoUpdaterPID", process.pid)
    const config = {
        pkg: core.getInput("package-json") ? core.getInput("package-json") : "./package.json",
        changelog: core.getInput("changelog") ? core.getInput("changelog") : "./CHANGELOG.md",
        repo: core.getInput("repository") ? core.getInput("repository"): "",
        branch: core.getInput("branch") ? core.getInput("branch") : "master",
        githubToken: core.getInput("github-token") ? core.getInput("github-token") : "",
        stages: core.getInput("stages") ? core.getInput("stages").split("&&").filter((e)=>(e !== "")) : []
    }
    await fs.promises.mkdir(workDir, {
        recursive: true
    })
    // initialize and checkout repo
    const _git1 = await cpPromise("git", [
        "init"
    ])
    if(
        (_git1.err !== "") &&
        (_git1.code !== 0)
    ) throw new Error(_git1.err)
    core.debug("git init | " + JSON.stringify(_git1, undefined, 4))
    const _git2 = await cpPromise("git", [
        "config",
        "--local",
        "user.email",
        "\"admin@sergdudko.tk\""
    ])
    if(
        (_git2.err !== "") &&
        (_git2.code !== 0)
    ) throw new Error(_git2.err)
    core.debug("git --local user.email \"admin@sergdudko.tk\" | " + JSON.stringify(_git2, undefined, 4))
    const _git3 = await cpPromise("git", [
        "config",
        "--local",
        "user.name",
        "github:siarheidudko/autoupdater"
    ])
    if(
        (_git3.err !== "") &&
        (_git3.code !== 0)
    ) throw new Error(_git3.err)
    core.debug("git --local user.name \"github:siarheidudko/autoupdater\" | " + JSON.stringify(_git3, undefined, 4))
    const _git4 = await cpPromise("git", [
        "remote",
        "add",
        "autoupdater",
        "https://" + config.repo.split("/")[0] + ":" + config.githubToken + "@github.com/" + config.repo + ".git"
    ])
    if(
        (_git4.err !== "") &&
        (_git4.code !== 0)
    ) throw new Error(_git4.err)
    core.debug("git remote add autoupdater https://github.com/" + config.repo + ".git | " + JSON.stringify(_git4, undefined, 4))
    const _git5 = await cpPromise("git", [
        "fetch",
        "autoupdater"
    ])
    if(
        (_git5.err !== "") &&
        (_git5.code !== 0)
    ) throw new Error(_git5.err)
    core.debug("git fetch autoupdater | " + JSON.stringify(_git5, undefined, 4))
    const _git6 = await cpPromise("git", [
        "checkout",
        config.branch
    ])
    if(
        (_git6.err !== "") &&
        (_git6.code !== 0)
    ) throw new Error(_git6.err)
    core.debug("git checkout " + config.branch + " | " + JSON.stringify(_git6, undefined, 4))
    // update libs
    let pkg = await fs.promises.readFile(path.join(workDir, config.pkg), {
        encoding: "utf8",
        flag: "r"
    }).then((e)=>Promise.resolve(JSON.parse(e)))
    let isUpdated = false
    const _npm1 = await cpPromise("npm", [
        "update"
    ])
    if(
        (_npm1.err !== "") &&
        (_npm1.code !== 0)
    ) throw new Error(_npm1.err)
    core.debug("npm update | " + JSON.stringify(_npm1, undefined, 4))
    if(_npm1.log.length > 0)
        isUpdated = true
    const _npm2 = await cpPromise("npm", [
        "outdate"
    ])
    if(
        (_npm2.err !== "") &&
        (_npm2.code !== 0)
    ) throw new Error(_npm2.err)
    core.debug("npm outdate | " + JSON.stringify(_npm2, undefined, 4))
    let updates
    if(_npm2.log.length > 0){
        updates = _npm2.log.split("\n")
            .map((e)=>e.replace(/\s.+$/gi, ""))
            .filter((e)=>((e !== "Package")&&(e !== "")))
        const dependencies = updates.filter((e)=>(typeof(pkg.dependencies[e]) === "string"))
            .map((e)=>e+"@latest")
        const devDependencies = updates.filter((e)=>(typeof(pkg.devDependencies[e]) === "string"))
            .map((e)=>e+"@latest")
        if(dependencies.length > 0){ 
            const _npm3 = await cpPromise("npm", [
                "install", 
                ...dependencies, 
                "--save"
            ])
            if(
                (_npm3.err !== "") &&
                (_npm3.code !== 0)
            ) throw new Error(_npm3.err)
            core.debug("npm install "+dependencies.join(" ")+" --save | " + JSON.stringify(_npm3, undefined, 4))
            isUpdated = true
        }
        if(devDependencies.length > 0){ 
            const _npm4 = await cpPromise("npm", [
                "install", 
                ...devDependencies, 
                "--save-dev"
            ])
            if(
                (_npm4.err !== "") &&
                (_npm4.code !== 0)
            ) throw new Error(_npm4.err)
            core.debug("npm install "+devDependencies.join(" ")+" --save-dev | " + JSON.stringify(_npm4, undefined, 4))
            isUpdated = true
        }
    }
    if(isUpdated === true){
        pkg = await fs.promises.readFile(path.join(workDir, config.pkg), {
            encoding: "utf8",
            flag: "r"
        }).then((e)=>Promise.resolve(JSON.parse(e)))
        pkg.version = pkg.version.split(".")
            .map((value, index, array)=>(index === (array.length -1)) ? ( Number.parseInt(value) + 1 ).toString() : value )
            .join(".")
        await fs.promises.writeFile(path.join(workDir, config.pkg), Buffer.from(JSON.stringify(pkg, undefined, 4)), {
            encoding: "utf8",
            flag: "w" 
        })
        core.debug("Updated version (" + pkg.version + ") in " + path.join(workDir, config.pkg))
        const changelog = await fs.promises.readFile(path.join(workDir, config.changelog), {
            flag: "r"
        }).catch((e)=>{
            if(e.code === "ENOENT") return Promise.resolve(Buffer.from(""))
            return Promise.reject(e)
        })
        const msg = "# " + 
            pkg.version + 
            " / " + 
            new Date().toJSON().substr(0,10) + 
            "\n\n### :tada: Enhancements\n- Updated dependencies: " + updates.join(", ") + "\n\n"
        await fs.promises.writeFile(path.join(workDir, config.changelog), Buffer.concat([
            Buffer.from(msg), 
            changelog
        ]), {
            encoding: "utf8",
            flag: "w" 
        })
        core.debug("Updated log in " + path.join(workDir, config.changelog))
        for(const stage of config.stages){
            const arg = stage.split(/\s+/gi)
            const cN = await cpPromise(arg[0], arg.slice(1))
            if(cN.err !== "") throw new Error(cN.err)
            core.debug(stage + " | " + JSON.stringify(cN, undefined, 4))
        }
        // commit updates
        const _git7 = await cpPromise("git", [
            "add",
            "--all"
        ])
        if(
            (_git7.err !== "") &&
            (_git7.code !== 0)
        ) throw new Error(_git7.err)
        core.debug("git add --all | " + JSON.stringify(_git7, undefined, 4)) 
        const _git8 = await cpPromise("git", [
            "commit",
            "-m",
            "\"Updated dependencies: " + updates.join(", ") + "\""
        ])
        if(
            (_git8.err !== "") &&
            (_git8.code !== 0)
        ) throw new Error(_git8.err)
        core.debug("git commit -m \"Updated dependencies: " + updates.join(", ") + "\" | " + JSON.stringify(_git8, undefined, 4))   
        const _git9 = await cpPromise("git", [
            "tag",
            "v" + pkg.version
        ])
        if(
            (_git9.err !== "") &&
            (_git9.code !== 0)
        ) throw new Error(_git9.err)
        core.debug("git tag v" + pkg.version + " | " + JSON.stringify(_git9, undefined, 4))
        const _git10 = await cpPromise("git", [
            "push",
            "autoupdater",
            config.branch
        ])
        if(
            (_git10.err !== "") &&
            (_git10.code !== 0)
        ) throw new Error(_git10.err)
        core.debug("git push autoupdater " + config.branch + " | " + JSON.stringify(_git10, undefined, 4))
        const _git11 = await cpPromise("git", [
            "push",
            "v" + pkg.version
        ])
        if(
            (_git11.err !== "") &&
            (_git11.code !== 0)
        ) throw new Error(_git11.err)
        core.debug("git push v" + pkg.version + " | " + JSON.stringify(_git11, undefined, 4))
    }
})().then((e) => {
    core.info((e) ? e : "Completed")
    setTimeout(process.exit, 1, 0)
}).catch((e) => {
    core.setFailed((e) ? e : new Error("Unknown error"))
    setTimeout(process.exit, 1, 1)
})