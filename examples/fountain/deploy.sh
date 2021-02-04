#!/bin/bash
cd `dirname "$0"`
APP=$(basename `pwd`)
WONDERLAND=../../../wonderland

if [[ ! -d $WONDERLAND ]] ; then
    echo "Where is Wonderland? Not at '$WONDERLAND' it seeems ¯\_(ツ)_/¯"
    exit 1
fi

CHANGED=`git status --porcelain -- .`
if [[ -n "$CHANGED" ]] ; then
    echo "Repo is dirty!"
    echo "$CHANGED"
    exit 1
fi

# update worldcore
(cd ../../ ; pnpm i) || exit 1

# update this
pnpm i || exit 1

# build this
rm -rf dist
pnpm run build-dev || exit 1

# FIXME!!! production builds fail on iOS so we are deploying dev build for now

# copy to croquet.io/dev/
TARGET=$WONDERLAND/servers/croquet-io-dev/$APP
rm -rf $TARGET/*
cp -a dist/ $TARGET/

# commit
(cd $TARGET && git add . && git commit -m "[$APP] deploy to croquet.io/dev/$APP/" -- . && git --no-pager log -1 --stat)
