# Worldcore

Worldcore is a multi-player 3D game engine for the web, running on Croquet. It is modular, extensible, and cross-platform.

## Packages

Worldcore consists of multiple packages, which all live in this repository under `packages/`:

* `@croquet/worldcore-kernel`: provides the core  functionality, and re-exports all of Croquet's exports (`packages/kernel`)
* `@croquet/worldcore-*`: optional packages (`packages/*`)
* `@croquet/worldcore`: combines all of the above in a single package for convenience (`packages/full`)

## Prerequisites:

* `git` https://git-scm.com/download/
* `node` https://nodejs.org/en/download/
* `pnpm` https://pnpm.io/installation

We use `git` to manage our source code. To verify installation worked, type the command line `git --version` and you should see output similar to this:

    > git --version
    git version 2.28.0

The exact version does not matter. Similarly for Node, which we use for our build tools:

    > node --version
    v14.9.0

Install `pnpm` using node's "npm" command

    > npm i -g pnpm

Clone the Worldcore repo

    > git clone https://github.com/croquet/worldcore.git

## Modify and run an example

* Execute these commands one-by-one to get Worldcore (we do not show the output here, only the commands)

      > cd worldcore/examples/wctest
      > pnpm i
      > pnpm start

  This command will not stop until you press ctrl-c. It will continually rebuild files as you edit them.

* Open http://localhost:1234/ in a web browser to see the "wctest" example app

## Modify and test Worldcore packages

To test a locally modified Worldcore package, you need to modify an example's packages to not use the released version on npm, but the version you modified locally. E.g. for `wctest`:

    cd examples/wctest
    pnpm i ../../packages/kernel

will cause `wctest` to use your locally modified `@croquet/worldcore-kernel` instead.
