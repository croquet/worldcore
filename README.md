# Worldcore

Worldcore is a multi-player 3D game engine for the web, running on Croquet. It is modular, extensible, and cross-platform.

In this monorepo you will find

* the packages making up Worldcore itself
* example apps
* and tutorials

## Packages

Worldcore consists of multiple packages, which all live in this repository under `packages/`:

* `@croquet/worldcore-kernel`: provides the core  functionality, and re-exports all of Croquet's exports (`packages/kernel`)
* `@croquet/worldcore-*`: optional packages (`packages/*`)
* `@croquet/worldcore`: combines all of the above in a single package for convenience (`packages/full`)

## Prerequisites:

* `git` https://git-scm.com/download/
* `node` https://nodejs.org/en/download/

We use `git` to manage our source code. To verify installation worked, type the command line `git --version` and you should see output similar to this:

    git --version
    => git version 2.37.1

The exact version does not matter. Similarly for Node, which we use for our build tools:

    node --version
    => v16.20.0

## Preparation

We use Lerna to manage the packages in this monorepo.

Clone the Worldcore repo:

    git clone https://github.com/croquet/worldcore.git

Install build tools (e.g. `lerna`):

    cd worldcore
    npm i
    npx lerna bootstrap

## Run and modify an example

* Execute these commands (we do not show the output here, only the commands):

      cd worldcore/tutorials/tutorial01
      npm start

  This command will not stop until you press ctrl-c. It will continually rebuild files as you edit them.

* Open http://localhost:1234/ in a web browser to see the "tutorial1" example app

## Modify and test Worldcore packages

To test a locally modified Worldcore package, we need to make an example use the version you modified locally, rather than the released version specified in its `package.json`. This is the main purpose of `lerna`. Instead of installing packages from npm in `node_modules`, it will link your local version of the package into `node_modules`.

Assuming you did not do the `lerna bootstrap` step above, but used a regular `npm i`, you would have this structure in the `node_modules/@croquet` directory, containing the officially published Worldcore packages:

    ls -lF tutorials/tutorial01/node_modules/\@croquet/
    => croquet/
    => worldcore/
    => worldcore-kernel/
    => worldcore-rapier/
    => worldcore-three/
    => worldcore-widget/
    => worldcore-widget2/

But if you bootstrap the repo using [`lerna`](https://lerna.js.org):

    npx lerna clean
    npx lerna bootstrap

... then the `node_modules/@croquet` directory will use the local `worldcore` via symlink:

    ls -lF tutorials/tutorial01/node_modules/\@croquet/
    => worldcore@ -> ../../../../packages/full

which in turn links to all the individual local worldcore packages

    ls -lF packages/full/node_modules/@croquet
    => worldcore-kernel@ -> ../../../kernel
    => worldcore-rapier@ -> ../../../rapier
    => worldcore-three@ -> ../../../three
    => worldcore-widget@ -> ../../../widget
    => worldcore-widget2@ -> ../../../widget2

Now when you modify something in e.g. `packages/three` and rebuild `tutorial01`, it will use your version of the packages, rather than the released versions.

## Publish Worldcore packages

We use `lerna` with "fixed" versioning, meaning each package will have the same version.

1. (NB: skip this step for a prerelease) For each modified package:

   * update `CHANGELOG.md` with the next release version

2. If you have updated any dependencies (e.g., of the kernel on the Croquet library), make sure all packages have the latest dependencies

        lerna clean
        lerna bootstrap

3. Commit everything (the next step needs a clean repo)

4. Bump the version (NB: for a prerelease, use an alternative command as explained below)

        npx lerna version --no-push

   This will allow you to select the next version number,
   and update all packages to that version, as well as their dependencies
   (which includes demos, examples, and tutorials, as listed in `lerna.json`).

   We use `--no-push` to get a chance to roll back if needed
   (undo the version commit and delete the tag).

5. Push to git

        git push

6. Log into npm (only needed once for each computer; requires that you have npm credentials for the Croquet organization)

        npm login

7. Publish to npm

        npx lerna publish from-package

### Prereleases

For prereleases we don't update the `CHANGELOG.md` files, and step 4 is adjusted to specify that private packages are not to be updated, and setting a prerelease id of `"alpha"` or `"beta"`:

    npx lerna version --no-push --no-private --preid alpha
    or
    npx lerna version --no-push --no-private --preid beta

and selecting one of the `pre*` options from the list.

When publishing a prerelease, it will be tagged `"pre"` (as opposed to the default `"latest"`) as specified in `lerna.json`.
This will cause the prereleases to not be installed automatically, because the regular `npm i` command will only use the `latest` tag.
To install the latest pre-release, people would use e.g. `npm i @croquet/worldcore@pre`