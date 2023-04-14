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
* `lerna` https://lerna.js.org/

We use `git` to manage our source code. To verify installation worked, type the command line `git --version` and you should see output similar to this:

    > git --version
    git version 2.28.0

The exact version does not matter. Similarly for Node, which we use for our build tools:

    > node --version
    v14.9.0

We use Lerna to manage the packages in this monorepo.
It is not needed if you just want to mofify the examples and tutorials.
You only need it to modify Worldcore itself:

    > npm i -g lerna

Clone the Worldcore repo:

    > git clone https://github.com/croquet/worldcore.git

Bootstrap links in your local repo:

    > lerna bootstrap

## Modify and run an example

* Execute these commands one-by-one (we do not show the output here, only the commands)

      > cd worldcore/tutorial/tutorial1
      > npm i
      > npm start

  This command will not stop until you press ctrl-c. It will continually rebuild files as you edit them.

* Open http://localhost:1234/ in a web browser to see the "tutorial1" example app

## Modify and test Worldcore packages

To test a locally modified Worldcore package, we need to make an example use the version you modified locally, rather than the released version specified in its `package.json`. This is the main purpose of `lerna`. Instead of installing packages from npm in `node_modules`, it will link your local version of the package into `node_modules`.

Assuming you did not do the `lerna bootstrap` step above, but used a regular `npm i`, you would have this structure in the `node_modules/@croquet` directory, containing the official Worldcore packages:

    worldcore$ ll examples/wctest/node_modules/\@croquet/

    croquet/
    worldcore-audio/
    worldcore-behavior/
    worldcore-kernel/
    worldcore-webgl/
    worldcore-widget/

But if you bootstrap the repo using [`lerna`](https://lerna.js.org):

    worldcore$ lerna bootstrap
    lerna notice cli v4.0.0
    lerna info versioning independent
    lerna info Bootstrapping 19 packages
    lerna info Installing external dependencies

... then the `node_modules/@croquet` directory will have proper links to your local packages:

    worldcore$ ll examples/wctest/node_modules/\@croquet/

    croquet/
    worldcore-audio@ -> ../../../../packages/audio
    worldcore-behavior@ -> ../../../../packages/behavior
    worldcore-kernel@ -> ../../../../packages/kernel
    worldcore-webgl@ -> ../../../../packages/webgl
    worldcore-widget@ -> ../../../../packages/widget

Now when you modify something in e.g. `packages/widget` and rebuild `wctest`, it will use your version of the packages, rather than the released versions.

## Publish Worldcore packages

We use `lerna` with "fixed" versioning, meaning each package will have the same version.

1. For each modified package:

   * update `CHANGELOG.md` with the next release version

2. commit everything (the next step needs a clean repo)

3. bump the version

        lerna version --no-push

   This will allow you to select the next version number,
   and update all packages to that version, as well as their dependencies
   (which includes demos, examples, and tutorials, as listed in `lerna.json`).

   We use `--no-push` to get a chance to roll back if needed
   (undo the version commit and delete the tag).

4. Push to git

        git push

5. publish to npm

       lerna publish from-package

### Prereleases

For prerelases we don't update the `CHANGELOG.md` files, but otherwise use the same steps as above, with prerelease ids `"alpha"` or `"beta"`:

    lerna version --preid alpha
    lerna version --preid beta

and selecting one of the `pre*` options from the list.

For publishing, we use `"pre"` as the prerelease channel (as opposed to the default `"latest"`):

    lerna publish from-package --pre-dist-tag pre

This will cause the prereleases to not be installed automatically, because the regular `npm i` command will only use the `latest` tag.

(Note to self: I just added a `preDistTag` option to `lerna.json` so in theory we do not need to specify it on the command line next time)
