#!/bin/bash
cd `dirname "$0"`

# update worldcore
(cd ../../ ; pnpm i) || exit 1

# update this
pnpm i || exit 1

# build this
rm -rf dist
pnpm run build-dev || exit 1
# (we temporarily deploy a dev build)

# copy to croquet.io/dev/
TARGET=../../../wonderland/servers/croquet-io-dev/wc_demo2
rm -rf $TARGET/*
cp -a dist/ $TARGET/

# commit
(cd $TARGET && git add . && git commit -m "[wc_demo2] deploy to croquet.io/dev/wc_demo2/" -- . && git log -1 --stat)
