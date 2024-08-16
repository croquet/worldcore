#!/usr/bin/env node

// bundles app, commits to wonderland (croquet-io-dev) repo

const { argv, exit } = require("process");
const { execSync } = require("child_process");
const path = require("path");
const fsx = require("fs-extra");
const simpleGit = require("simple-git");

const REPO = "worldcore";
const APP = argv[2];
if (!APP) { console.error("Usage: node deploy.js <APP>"); exit(1); }

async function getMeta(baseDir, format=`${REPO}: %D@%H Date: %ad\n`) {
    const git = simpleGit({ baseDir });
    const { latest: { meta } } = await git.log({ n: 1, format: { meta: format }});
    return meta;
}

async function deploy() {
    const SRC = __dirname;
    const WONDERLAND = path.join(SRC, '../../../wonderland');
    const TARGET = path.join(WONDERLAND, `servers/croquet-io-dev/${APP}`);

    // verify WONDERLAND dir
    try { await fsx.access(WONDERLAND, fsx.constants.W_OK) }
    catch (error) { console.error(`Expected Wonderland at ${WONDERLAND}\n${error.message}`); exit(1); }
    console.log(`Deploying to ${TARGET}`);

    // verify SRC repo
    const status = await simpleGit({ baseDir: SRC }).status();
    if (status.modified.length > 0) {
        console.error(`Repo has modified files:\n${status.modified.join('\n')}\nABORTING`);
        exit(1);
    }

    // build into croquet.io/dev/
    await fsx.emptyDir(TARGET);
    console.log(`Building ${APP}...`);
    console.log(execSync(`npm run build -- --output-path ${TARGET}`, {cwd: SRC}).toString());

    // add meta/version.txt
    const meta = await getMeta(SRC);
    await fsx.writeFile(path.join(TARGET, 'meta.txt'), meta);

    // commit to git
    const git = simpleGit({ baseDir: TARGET });
    await git.add(['-A', TARGET]);
    const { commit } = await git.commit(`[${APP}] deploy to croquet.io/dev/${APP}`, [TARGET]);
    if (!commit) {
        console.warn("Nothing committed?!");
    } else {
        console.log(await git.show(["--stat"]));
        console.log(`You still need to "git push" in ${WONDERLAND}\nto deploy to https://croquet.io/dev/${APP}`);
    }
}

deploy();
