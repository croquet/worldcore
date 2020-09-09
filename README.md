# Worldcore

## Prerequisites:

* `git` https://git-scm.com/download/
* `node` https://nodejs.org/en/download/

We use `git` to manage our source code. To verify installation worked, type the command line `git --version` and you should see output similar to this:

    > git --version
    git version 2.28.0

The exact version does not matter. Similarly for Node, which we use for our build tools:

    > node --version
    v14.9.0

## Setup:

* Install `pnpm` using node's "npm" command

      > npm i -g pnpm

* Execute these commands one-by-one to get Worldcore (we do not show the output here, only the commands)

      > git clone https://github.com/croquet/worldcore.git
      > cd worldcore
      > pnpm i
      > cd examples/wctest
      > pnpm i
    
## Run:

* Start the development server: 

      > pnpm start
    
  This command will not stop until you press ctrl-c. It will continually rebuild files as you edit them.

* Open http://localhost:1234/ in a web browser to see the "wctest" example app

