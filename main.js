"use strict"

const core = require("@actions/core")
const fs = require("fs")
const child_process = require("child_process")
const os = require("os")
const path = require("path")
const crypto = require("crypto")

const config = {
    pkg: "./package.json",
    changelog: "./CHANGELOG.md",
    repo: "",
    branch: "master",
    githubToken: "",
    stages: [],
    dir: path.join(os.tmpdir(), crypto.randomFillSync(Buffer.alloc(32)).toString("hex")),
    debug: false
}

async function cpPromise(proc, arg){
    return await new Promise((res, rej) =>{
        const p = child_process.spawn(proc, arg, {
            env: {
                ...process.env
            },
            cwd: config.dir
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
    if(
        (core.getInput("package-json")) &&
        (core.getInput("package-json") !== "")
    ) config.pkg = core.getInput("package-json")
    if(
        (core.getInput("changelog")) &&
        (core.getInput("changelog") !== "")
    ) config.changelog = core.getInput("changelog")
    if(
        (core.getInput("repository")) &&
        (core.getInput("repository") !== "")
    ) config.repo = core.getInput("repository")
    if(
        (core.getInput("branch")) &&
        (core.getInput("branch") !== "")
    ) config.branch = core.getInput("branch")
    if(
        (core.getInput("github-token")) &&
        (core.getInput("github-token") !== "")
    ) config.githubToken = core.getInput("github-token")
    if(
        (core.getInput("stages")) &&
        (core.getInput("stages") !== "")
    ) config.stages = core.getInput("stages").split("&&").filter((e)=>(e !== ""))
    if(
        (core.getInput("working-directory")) &&
        (core.getInput("working-directory") !== "")
    ) config.dir = core.getInput("working-directory")
    if(
        (core.getInput("debug")) &&
        (core.getInput("debug") === "true")
    ) config.debug = true
    await fs.promises.mkdir(config.dir, {
        recursive: true
    })
    core.saveState("AutoUpdaterconfig.dir", config.dir)
    core.saveState("AutoUpdaterPID", process.pid)
    // initialize and checkout repo
    if(config.debug) core.info("RUN: git init")
    const _git1 = await cpPromise("git", [
        "init"
    ])
    if(
        (_git1.err !== "") &&
        (_git1.code !== 0)
    ) throw new Error(_git1.err)
    if(config.debug) core.info("COMPLETE: git init | " + JSON.stringify(_git1, undefined, 4))
    if(config.debug) core.info("RUN: git --local user.email \"admin@sergdudko.tk\"")
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
    if(config.debug) core.info("COMPLETE: git --local user.email \"admin@sergdudko.tk\" | " + JSON.stringify(_git2, undefined, 4))
    if(config.debug) core.info("RUN: git --local user.name \"github:siarheidudko/autoupdater\"")
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
    if(config.debug) core.info("COMPLETE: git --local user.name \"github:siarheidudko/autoupdater\" | " + JSON.stringify(_git3, undefined, 4))
    if(config.debug) core.info("RUN: git remote add autoupdater https://github.com/" + config.repo + ".git")
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
    if(config.debug) core.info("COMPLETE: git remote add autoupdater https://github.com/" + config.repo + ".git | " + JSON.stringify(_git4, undefined, 4))
    if(config.debug) core.info("RUN: git fetch autoupdater")
    const _git5 = await cpPromise("git", [
        "fetch",
        "autoupdater"
    ])
    if(
        (_git5.err !== "") &&
        (_git5.code !== 0)
    ) throw new Error(_git5.err)
    if(config.debug) core.info("COMPLETE: git fetch autoupdater | " + JSON.stringify(_git5, undefined, 4))
    if(config.debug) core.info("RUN: git checkout " + config.branch)
    const _git6 = await cpPromise("git", [
        "checkout",
        config.branch
    ])
    if(
        (_git6.err !== "") &&
        (_git6.code !== 0)
    ) throw new Error(_git6.err)
    if(config.debug) core.info("COMPLETE: git checkout " + config.branch + " | " + JSON.stringify(_git6, undefined, 4))
    // update libs
    if(config.debug) core.info("RUN: npm update")
    let pkg = await fs.promises.readFile(path.join(config.dir, config.pkg), {
        encoding: "utf8",
        flag: "r"
    }).then((e)=>Promise.resolve(JSON.parse(e)))
    let isUpdated = false
    let updatedLibs = []
    const _npm1 = await cpPromise("npm", [
        "update"
    ])
    if(
        (_npm1.err !== "") &&
        (_npm1.code !== 0)
    ) throw new Error(_npm1.err)
    if(config.debug) core.info("COMPLETE: npm update | " + JSON.stringify(_npm1, undefined, 4))
    updatedLibs = (_npm1.log.match(/\+\s\w+@\d\.\d\.\d\s*(\n|\r|\r\n)/))?
        _npm1.log.match(/\+\s\w+@\d\.\d\.\d\s*(\n|\r|\r\n)/gm)
            .map(e=>
                e.replace(/\+\s/,"")
                .replace(/@\d\.\d\.\d\s*(\n|\r|\r\n)/,"")
            ):updatedLibs
    if(_npm1.log.length > 0)
        isUpdated = true
    if(config.debug) core.info("RUN: npm outdate")
    const _npm2 = await cpPromise("npm", [
        "outdate"
    ])
    if(
        (_npm2.err !== "") &&
        (_npm2.code !== 0)
    ) throw new Error(_npm2.err)
    if(config.debug) core.info("COMPLETE: npm outdate | " + JSON.stringify(_npm2, undefined, 4))
    if(_npm2.log.length > 0){
        const updates = _npm2.log.split("\n")
            .map((e)=>e.replace(/\s.+$/gi, ""))
            .filter((e)=>((e !== "Package")&&(e !== "")))
        updatedLibs = [
            ...updatedLibs,
            ...updates
        ]
        const dependencies = updates.filter((e)=>(typeof(pkg.dependencies[e]) === "string"))
            .map((e)=>e+"@latest")
        const devDependencies = updates.filter((e)=>(typeof(pkg.devDependencies[e]) === "string"))
            .map((e)=>e+"@latest")
        if(dependencies.length > 0){
            ore.info("RUN: npm install "+dependencies.join(" ")+" --save")
            const _npm3 = await cpPromise("npm", [
                "install", 
                ...dependencies, 
                "--save"
            ])
            if(
                (_npm3.err !== "") &&
                (_npm3.code !== 0)
            ) throw new Error(_npm3.err)
            if(config.debug) core.info("COMPLETE: npm install "+dependencies.join(" ")+" --save | " + JSON.stringify(_npm3, undefined, 4))
            isUpdated = true
        }
        if(devDependencies.length > 0){
            if(config.debug) core.info("RUN: npm install "+devDependencies.join(" ")+" --save-dev")
            const _npm4 = await cpPromise("npm", [
                "install", 
                ...devDependencies, 
                "--save-dev"
            ])
            if(
                (_npm4.err !== "") &&
                (_npm4.code !== 0)
            ) throw new Error(_npm4.err)
            if(config.debug) core.info("COMPLETE: npm install "+devDependencies.join(" ")+" --save-dev | " + JSON.stringify(_npm4, undefined, 4))
            isUpdated = true
        }
    }
    if(isUpdated === true){
        if(config.debug) core.info("RUN: Updating version (" + pkg.version + ") in " + path.join(config.dir, config.pkg))
        pkg = await fs.promises.readFile(path.join(config.dir, config.pkg), {
            encoding: "utf8",
            flag: "r"
        }).then((e)=>Promise.resolve(JSON.parse(e)))
        pkg.version = pkg.version.split(".")
            .map((value, index, array)=>(index === (array.length -1)) ? ( Number.parseInt(value) + 1 ).toString() : value )
            .join(".")
        await fs.promises.writeFile(path.join(config.dir, config.pkg), Buffer.from(JSON.stringify(pkg, undefined, 4)), {
            encoding: "utf8",
            flag: "w" 
        })
        if(config.debug) core.info("COMPLETE: Updated version (" + pkg.version + ") in " + path.join(config.dir, config.pkg))
        if(config.debug) core.info("RUN: Updating log in " + path.join(config.dir, config.changelog))
        const changelog = await fs.promises.readFile(path.join(config.dir, config.changelog), {
            flag: "r"
        }).catch((e)=>{
            if(e.code === "ENOENT") return Promise.resolve(Buffer.from(""))
            return Promise.reject(e)
        })
        const msg = "# " + 
            pkg.version + 
            " / " + 
            new Date().toJSON().substr(0,10) + 
            "\n\n### :tada: Enhancements\n- Updated dependencies: " + updatedLibs.join(", ") + "\n\n"
        await fs.promises.writeFile(path.join(config.dir, config.changelog), Buffer.concat([
            Buffer.from(msg), 
            changelog
        ]), {
            encoding: "utf8",
            flag: "w" 
        })
        if(config.debug) core.info("COMPLETE: Updated log in " + path.join(config.dir, config.changelog))
        for(const stage of config.stages){
            const arg = stage.split(/\s+/gi)
            if(config.debug) core.info("RUN: " + stage)
            const _custom = await cpPromise(arg[0], arg.slice(1))
            if(
                (_custom.err !== "") &&
                (_custom.code !== 0)
            ) throw new Error(_custom.err)
            if(config.debug) core.info("COMPLETE: " + stage + " | " + JSON.stringify(_custom, undefined, 4))
        }
        // commit updates
        if(config.debug) core.info("RUN: git add --all")
        const _git7 = await cpPromise("git", [
            "add",
            "--all"
        ])
        if(
            (_git7.err !== "") &&
            (_git7.code !== 0)
        ) throw new Error(_git7.err)
        if(config.debug) core.info("COMPLETE: git add --all | " + JSON.stringify(_git7, undefined, 4))
        if(config.debug) core.info("RUN: git commit -m \"Updated dependencies: " + updatedLibs.join(", ") + "\"")
        const _git8 = await cpPromise("git", [
            "commit",
            "-m",
            "\"Updated dependencies: " + updatedLibs.join(", ") + "\""
        ])
        if(
            (_git8.err !== "") &&
            (_git8.code !== 0)
        ) throw new Error(_git8.err)
        if(config.debug) core.info("COMPLETE: git commit -m \"Updated dependencies: " + updatedLibs.join(", ") + "\" | " + JSON.stringify(_git8, undefined, 4))   
        if(config.debug) core.info("RUN: git tag v" + pkg.version)
        const _git9 = await cpPromise("git", [
            "tag",
            "v" + pkg.version
        ])
        if(
            (_git9.err !== "") &&
            (_git9.code !== 0)
        ) throw new Error(_git9.err)
        if(config.debug) core.info("COMPLETE: git tag v" + pkg.version + " | " + JSON.stringify(_git9, undefined, 4))
        if(config.debug) core.info("RUN: git push autoupdater " + config.branch)
        const _git10 = await cpPromise("git", [
            "push",
            "autoupdater",
            config.branch
        ])
        if(
            (_git10.err !== "") &&
            (_git10.code !== 0)
        ) throw new Error(_git10.err)
        if(config.debug) core.info("COMPLETE: git push autoupdater " + config.branch + " | " + JSON.stringify(_git10, undefined, 4))
        if(config.debug) core.info("RUN: git push autoupdater v" + pkg.version)
        const _git11 = await cpPromise("git", [
            "push",
            "autoupdater",
            "v" + pkg.version
        ])
        if(
            (_git11.err !== "") &&
            (_git11.code !== 0)
        ) throw new Error(_git11.err)
        if(config.debug) core.info("COMPLETE: git push autoupdater v" + pkg.version + " | " + JSON.stringify(_git11, undefined, 4))
    }
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